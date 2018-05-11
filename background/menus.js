"use strict";

if(typeof(browser.menus) !== "undefined") {
	browser.menus.create({
		id: "browser_action_options",
		title: browser.i18n.getMessage("menu_options"),
		contexts: ["browser_action"]
	});
	
	browser.menus.onClicked.addListener((info) => {
		switch(info.menuItemId) {
			case "browser_action_options":
				browser.runtime.openOptionsPage().catch(console.error);
			break;
		}
	});
}
