/**
 * Determine whether the given hostname is actually an IP address
 *
 * This will detect both IPv4 and IPv6 addresses and will return `true`
 * or `false` accordingly.
 */
function isHostnameIPAddress(hostname) {
	// Strip delimiting brackets that might have been added to seperate the hostname from the port
	if(hostname.startsWith("[") && hostname.endsWith("]")) {
		hostname = hostname.substr(1, hostname.length-1);
	}
	
	return (IPv6_PATTERN.test(hostname) || IPv4_PATTERN.test(hostname));
}
// From https://jsfiddle.net/usmanajmal/AJEzQ/108/
const IPv6_PATTERN = /^((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?$/;
// From http://stackoverflow.com/a/9221063/277882
const IPv4_PATTERN = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;


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
	"whitelist": "http://meh.schizofreni.co/smart-referer/whitelist.txt"
};


/**
 * Track current add-on options, so that their are always available when resolving a request
 */
// Start with the default options
let options = Object.assign({}, OPTIONS_DEFAULT);
let policy  = new Policy(options.allow);

// Now load all currently set options from storage
browser.storage.local.get().then((result) => {
	// Update the default options with the real ones loaded from storage
	Object.assign(options, result);

	// Write back the final option list so that the defaults are properly displayed on the
	// options page as well
	return browser.storage.local.set(options);
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
	}).finally(() => {
		// Schedule another policy update
		policyUpdateHandle = setTimeout(updatePolicy, 86400000);
	}).catch(console.exception);
}


/**
 * Callback function that will process an about-to-be-sent blocking request and modify
 * its "Referer"-header accoriding to the current options
 */
function requestListener(request) {
	// Find current referer header in request
	let referer = null;
	for(let header of request.requestHeaders) {
		if(header.name === "Referer" && header.value) {
			referer = header;
			break;
		}
	}
	if(!referer) {
		return;
	}
	
	try {
		let toURI   = new URL(request.url);
		let fromURI = new URL(referer.value);
		
		// Check if this request can be dismissed early by either being a perfect
		// source host / target host match OR by being whitelisted somewhere
		if(fromURI.host === toURI.host || policy.allows(fromURI.host, toURI.host)) {
			return;
		}
		
		// Attempt lax matching only if we, in fact, have hostnames and not IP addresses
		let isIPAddress = !isHostnameIPAddress(fromURI.host) && !isHostnameIPAddress(toURI.host);
		if(isIPAddress && !options.strict) {
			// Parse the domain names and look for each of their base domains
			let fromHostBase = psl.get(fromURI.host);
			let toHostBase   = psl.get(toURI.host);
			
			// Allow if the both base domain names match
			if(fromHostBase && toHostBase && fromHostBase === toHostBase) {
				return;
			}
		}
	} catch(e) {
		console.exception(e);
	}
	
	console.debug(`Rejecting referer "${referer.value}" for "${request.url}"`);
	
	switch(options.mode) {
		case "direct":
			referer.value = null;
		break;
		
		case "self":
			referer.value = request.url;
		break;
		
		default:
			referer.value = options.referer;
	}
	
	return {requestHeaders: request.requestHeaders};
}

let requestListenerEnabled = false;
function setRequestListenerStatus(enable) {
	if(!requestListenerEnabled && enable) {
		requestListenerEnabled = true;
		browser.webRequest.onBeforeSendHeaders.addListener(
			requestListener,
			{urls: ["<all_urls>"]},
			["blocking", "requestHeaders"]
		);
	} else if(requestListenerEnabled && !enable) {
		requestListenerEnabled = false;
		browser.webRequest.onBeforeSendHeaders.removeListener(requestListener);
	}
}

// Enable request processing by default
setRequestListenerStatus(true);

// Monitor settings for changes to the request processing setting
browser.storage.onChanged.addListener((changes, areaName) => {
	for(let name of Object.keys(changes)) {
		if(areaName === "local" && name === "enable") {
			setRequestListenerStatus(changes[name].newValue);
		}
	}
});
