/*
 *           DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
 *                   Version 2, December 2004
 *
 *           DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
 *  TERMS AND CONDITIONS FOR COPYING, DISTRIBUTION AND MODIFICATION
 *
 *  0. You just DO WHAT THE FUCK YOU WANT TO.
 *********************************************************************/

const { classes: Cc, interfaces: Ci, results: Cr, utils: Cu } = Components;


const LegacyPrefs = {
	BRANCH: "extensions.smart-referer.",
	
	
	read: function() {
		const prefService = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch(LegacyPrefs.BRANCH);
		
		let result = {};
		
		// Copy all known preferences that have an equivallent in the new WebExtension add-on
		["strict:bool", "mode:char", "referer:char", "allow:char", "whitelist:char"].forEach((p) => {
			let [name, type] = p.split(":");
			
			try {
				dump(`SmartReferer.LegacyPrefs: Reading ${name}:${type} ...\n`);
				switch(type) {
					case "bool":
						result[name] = prefService.getBoolPref(name);
					break;
					
					case "char":
						result[name] = prefService.getCharPref(name);
					break;
					
					case "int":
						result[name] = prefService.getIntPref(name);
					break;
				}
			} catch(e) {
				// Preference did not exist
				dump(`SmartReferer.LegacyPrefs:  - Got exception: ${e}\n`);
			}
		});
		
		// Special treatment for the legacy "to" and "from" preferences
		try {
			dump(`SmartReferer.LegacyPrefs: Reading whitelist.to:char ...\n`);
			let whitelistTo = prefService.getCharPref("whitelist.to");
			whitelistTo.trim().split(/\s+/g).forEach((host) => {
				if(host) {
					if(typeof(result["allow"]) === "undefined") {
						result["allow"] = "";
					}
					
					result["allow"] += " " + `*>${host}`;
				}
			});
		} catch(e) {
			dump(`SmartReferer.LegacyPrefs:  - Got exception: ${e}\n`);
		}
		
		try {
			dump(`SmartReferer.LegacyPrefs: Reading whitelist.from:char ...\n`);
			let whitelistFrom = prefService.getCharPref("whitelist.from");
			whitelistFrom.trim().split(/\s+/g).forEach((host) => {
				if(host) {
					if(typeof(result["allow"]) === "undefined") {
						result["allow"] = "";
					}
					
					result["allow"] += " " + `${host}>*`;
				}
			});
		} catch(e) {
			dump(`SmartReferer.LegacyPrefs:  - Got exception: ${e}\n`);
		}
		
		dump(`SmartReferer.LegacyPrefs: Scrapped preference data: ${result.toSource()}\n`);
		return result;
	},
	
	
	purge: function() {
		const prefService = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch(LegacyPrefs.BRANCH);
		
		["strict", "mode", "referer", "allow", "whitelist", "whitelist.from", "whitelist.to"].forEach((name) => {
			try {
				dump(`SmartReferer.LegacyPrefs: Clearing ${name} ...\n`);
				prefService.clearUserPref(name);
			} catch(e) {
				dump(`SmartReferer.LegacyPrefs:  - Got exception: ${e}\n`);
			}
		});
		prefService.deleteBranch("");
		dump(`SmartReferer.LegacyPrefs: Purged preference data\n`);
		return true;
	}
};



function install() {}

function startup({webExtension}) {
	webExtension.startup().then(api => {
		api.browser.runtime.onMessage.addListener((request, sender, sendReply) => {
			if(request === "read-legacy-prefs") {
				sendReply(LegacyPrefs.read());
			} else if(request === "purge-legacy-prefs") {
				sendReply(LegacyPrefs.purge());
			}
		});
	});
}

function shutdown() {}
