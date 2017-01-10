// Monitor settings for changes to the request processing setting
browser.storage.onChanged.addListener((changes, areaName) => {
	for(let name of Object.keys(changes)) {
		if(areaName === "local" && name === "enable") {
			console.log(name, changes[name]);
			if(changes[name].newValue === true) {
				browser.browserAction.setIcon({ path: { 256: "icon.svg" } });
				browser.browserAction.setTitle({ title: "Smart Referer – Enabled" });
			} else {
				browser.browserAction.setIcon({ path: { 256: "icon-light.svg" } });
				browser.browserAction.setTitle({ title: "Smart Referer – Disabled" });
			}
		}
	}
});

browser.browserAction.onClicked.addListener((tab) => {
	browser.storage.local.get(["enable"]).then((result) => {
		return browser.storage.local.set({ enable: !result.enable });
	}).catch(console.exception);
});
