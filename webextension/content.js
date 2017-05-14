let referer = document.referrer;

// Temporarily apply the default behavior for rejected web pages until we have access to the
// extension storage to figure out what we are actually supposed to do (Mozilla bugzilla#…)
Object.defineProperty(document.wrappedJSObject, "referrer", {
	enumerable:   true,
	configurable: true,
	value:        window.location.href
});

// Read from storage to obtain the actual configuration
browser.storage.local.get(["enable", "strict", "mode", "referer", "policy"]).then((options) => {
	let policy = (typeof(options["policy"]) === "string") ? Policy.fromString(options["policy"]) : new Policy();
	
	let updatedReferer = determineUpdatedReferer(referer, window.location.href, policy, options);
	if(updatedReferer !== null) {
		// Log message: Rejecting script Referer “$SOURCE$” for “$TARGET$”
		console.debug(browser.i18n.getMessage("log_blocked_script", [referer, window.location.href]));
	} else {
		// Restore original referer
		updatedReferer = referer;
	}
	
	Object.defineProperty(document.wrappedJSObject, "referrer", {
		enumerable: true,
		value:      updatedReferer
	});
});
