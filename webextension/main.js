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
	"whitelist": "http://meh.schizofreni.co/smart-referer/whitelist.txt",
	
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
	// Update the default options with the real ones loaded from storage, but ignore the "policy"
	// values as it's intended purely for communication with the content script
	delete result["policy"];
	Object.assign(options, result);

	//WEXT-MIGRATION: Query options from legacy add-on shim
	if(!options.migrated) {
		console.info("Attempting preference migration from legacy add-on…");
		return browser.runtime.sendMessage("read-legacy-prefs").then((result) => {
			console.info("Received preferences from legacy add-on:");
			console.info(result);
			
			Object.assign(options, result);
		}).catch((error) => {
			if(error.message.toLowerCase().includes("could not establish connection")) {
				console.info("Not running as part of legacy add-on, skipping migration!");
				
				options.migrated = true;
			} else {
				return Promise.reject(error);
			}
		});
	}
}).then(() => {
	// Write back the final option list so that the defaults are properly displayed on the
	// options page as well
	return browser.storage.local.set(options);
}).then(() => {
	//WEXT-MIGRATION: Remove options in legacy add-on shim after the new values have been saved
	if(!options.migrated) {
		console.info("Purging preferences from legacy add-on…");
		return browser.runtime.sendMessage("purge-legacy-prefs").then(() => {
			options.migrated = true;
			
			return browser.storage.local.set(options);
		}).then(() => {
			console.info("Preference migration successfully completed!");
		});
	} else {
		return Promise.resolve();
	}
}).then(() => {
	// Keep track of new developments in option land
	browser.storage.onChanged.addListener((changes, areaName) => {
		if(areaName !== "local") {
			return;
		}
	
		// Apply change
		for(let name of Object.keys(changes)) {
			options[name] = changes[name].newValue;
		}
	});

	// Done setting up options
}).then(() => {
	// Do initial policy fetch (will cause timer for more updates to be set)
	updatePolicy();

	// Also update policy when its settings are changed
	browser.storage.onChanged.addListener((changes, areaName) => {
		for(let name of Object.keys(changes)) {
			if(areaName === "local" && (name === "allow" || name === "whitelist")) {
				updatePolicy();
			}
		}
	});
}).catch(console.exception);


/**
 * Download an updated version of the online whitelist
 */
let policyUpdateHandle = 0;
function updatePolicy() {
	if(!options.whitelist) {
		policy = new Policy(options.allow);
		
		browser.storage.local.set({
			policy: policy.toString()
		}).catch(console.exception);
		
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
		policy = new Policy(`${options.allow} ${responseText}`);
		
		return browser.storage.local.set({
			policy: policy.toString()
		});
	}).finally(() => {
		// Schedule another policy update
		policyUpdateHandle = setTimeout(updatePolicy, 86400000);
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
function setProcessingStatus(enable) {
	if(!processingEnabled && enable) {
		processingEnabled = true;
		browser.webRequest.onBeforeSendHeaders.addListener(
			requestListener,
			{urls: ["<all_urls>"]},
			["blocking", "requestHeaders"]
		);
	} else if(processingEnabled && !enable) {
		browser.webRequest.onBeforeSendHeaders.removeListener(requestListener);
		processingEnabled = false;
	}
}

// Monitor options for changes to the request processing setting
browser.storage.onChanged.addListener((changes, areaName) => {
	for(let name of Object.keys(changes)) {
		if(areaName === "local" && name === "enable") {
			setProcessingStatus(changes[name].newValue);
		}
	}
});

// Enable request processing by default
setProcessingStatus(true);
