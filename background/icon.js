function generateIconTitle(enabled) {
	let titleMsgID = "icon_title_" + (enabled ? "enabled" : "disabled");
	return browser.runtime.getManifest().name + " – " + browser.i18n.getMessage(titleMsgID);
}

// Sniff for browsers supporting resetting the browserAction icon instead of just overriding it
let browserSupportsIconReset = false;
if(typeof(browser.browserAction.setIcon)  === "function"
&& typeof(browser.runtime.getBrowserInfo) === "function") {
	browser.runtime.getBrowserInfo().then((result) => {
		if(result.name === "Firefox" && parseInt(result.version.split(".")[0]) >= 59) {
			browserSupportsIconReset = true;
		}
	});
}

// Monitor settings for changes to the request processing setting
browser.storage.onChanged.addListener((changes, areaName) => {
	for(let name of Object.keys(changes)) {
		if(areaName === "local" && name === "enable") {
			if(changes[name].newValue === true) {
				if(browserSupportsIconReset) {
					// Prefer to reset the browserAction icon instead of overring it so that the
					// theme-specific theme_icons declared in the manifest can be used
					browser.browserAction.setIcon({
						path: null
					});
				//COMPAT: Firefox for Android 56+
				} else if(typeof(browser.browserAction.setIcon) !== "undefined") {
					
					browser.browserAction.setIcon({
						path: {
							// Use hand-rastorized icon for 16x16
							16:  "assets/icon-enabled.16x16.png",
							// SVG-scaling for well-enough for larger sizes
							256: "assets/icon-enabled.svg"
						}
					});
				}
				
				browser.browserAction.setTitle({ title: generateIconTitle(true) });
			} else {
				//COMPAT: Firefox for Android 56+
				if(typeof(browser.browserAction.setIcon) !== "undefined") {
					browser.browserAction.setIcon({
						path: {
							// Use hand-rastorized icon for 16x16
							16:  "assets/icon-disabled.16x16.png",
							// SVG-scaling for well-enough for larger sizes
							256: "assets/icon-disabled.svg"
						}
					});
				}
				
				browser.browserAction.setTitle({ title: generateIconTitle(false) });
			}
		}
	}
});

browser.browserAction.onClicked.addListener((tab) => {
	browser.storage.local.get(["enable"]).then((result) => {
		return browser.storage.local.set({ enable: !result.enable });
	}).catch(console.exception);
});
