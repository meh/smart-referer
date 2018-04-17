/**
 * Polyfill for `Promise.finally`
 */
Promise.prototype['finally'] = function (f) {
  return this.then(function (value) {
    return Promise.resolve(f()).then(function () {
      return value;
    });
  }, function (err) {
    return Promise.resolve(f()).then(function () {
      throw err;
    });
  });
}


/**
 * Default values for all options
 *
 * Defined here so that they are instantly available until the actual value can be loaded from
 * storage.
 */
const OPTIONS_DEFAULT = {
	"enable":  true,
	"strict":  false,
	"mode":    "self",
	"referer": "",

	// whitelisting
	"allow":     "",
	"whitelist": "https://raw.githubusercontent.com/meh/smart-referer/gh-pages/whitelist.txt",
	
	"migrated": false
};


/**
 * Track current add-on options, so that their are always available when resolving a request
 */
// Start with the default options
let options = Object.assign({}, OPTIONS_DEFAULT);
let policy  = new Policy(options.allow);

Promise.resolve().then(() => {
	// Load all currently set options from storage
	return browser.storage.local.get();
}).then((result) => {
	// Update the default options with the real ones loaded from storage
	Object.assign(options, result);
	
	// Write back the final option list so that the defaults are properly displayed on the
	// options page as well
	return browser.storage.local.set(options);
}).then(() => {
	// Do initial policy fetch (will cause timer for more updates to be set)
	refreshPolicy();
	
	// Keep track of new developments in option land
	browser.storage.onChanged.addListener((changes, areaName) => {
		if(areaName !== "local") {
			return;
		}
		
		// Copy changes to local options state
		for(let name of Object.keys(changes)) {
			options[name] = changes[name].newValue;
		}
		
		// Apply changes to option keys
		for(let name of Object.keys(changes)) {
			switch(name) {
				case "allow":
				case "whitelist":
					refreshPolicy();
					break;
				
				case "enable":
					applyRefererConfiguration();
					break;
			}
		}
	});
}).catch(console.exception);


/**
 * Download an updated version of the online whitelist
 */
let policyUpdateHandle = 0;
function refreshPolicy() {
	if(!options.whitelist) {
		policy = new Policy(options.allow);
		return;
	}
	
	// Stop any previous policy update timer
	if(policyUpdateHandle > 0) {
		clearTimeout(policyUpdateHandle);
		policyUpdateHandle = -1;
	} else if(policyUpdateHandle < 0) {
		// Another policy update is already in progress
		return;
	}
	
	fetch(options.whitelist).then((response) => response.text()).then((responseText) => {
		policy = new Policy(`${options.allow}\n${responseText}`);
	}).finally(() => {
		// Schedule another policy update
		policyUpdateHandle = setTimeout(refreshPolicy, 86400000);
	}).catch(console.exception);
}



/***************/
/* HTTP Header */
/***************/

/**
 * Callback function that will process an about-to-be-sent blocking request and modify
 * its "Referer"-header based on to current options
 */
function requestListener(request) {
	// Find current referer header in request
	let referer = null;
	for(let header of request.requestHeaders) {
		if(header.name.toLowerCase() === "referer" && header.value) {
			referer = header;
			break;
		}
	}
	
	if(referer === null) {
		return;
	}
	
	let updatedReferer = determineUpdatedReferer(referer.value, request.url, policy, options);
	
	if(updatedReferer === null) {
		return;
	}
	
	// Log message: Rejecting HTTP Referer “$SOURCE$” for “$TARGET$”
	console.debug(browser.i18n.getMessage("log_blocked_http", [referer.value, request.url]));
	
	referer.value = updatedReferer;
	return {requestHeaders: request.requestHeaders};
}


/*****************
 * Orchestration *
 *****************/

/**
 * Start or stop the HTTP header and JavaScript modifications
 */
let processingEnabled = false;
function applyRefererConfiguration() {
	if(!processingEnabled && options["enable"]) {
		processingEnabled = true;
		browser.webRequest.onBeforeSendHeaders.addListener(
			requestListener,
			{urls: ["<all_urls>"]},
			["blocking", "requestHeaders"]
		);
	} else if(processingEnabled && !options["enable"]) {
		browser.webRequest.onBeforeSendHeaders.removeListener(requestListener);
		processingEnabled = false;
	}
}

// Enable request processing based on the default configuration until the
// actual configuration has been retrieved from disk
applyRefererConfiguration();
