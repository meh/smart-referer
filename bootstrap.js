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

var spoofer = (function () {
	var c = function () {};

	var Observer              = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
	var NetworkIO             = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
	var ScriptSecurityManager = Cc["@mozilla.org/scriptsecuritymanager;1"].getService(Ci.nsIScriptSecurityManager);
	var EffectiveTLDService   = Cc["@mozilla.org/network/effective-tld-service;1"].getService(Ci.nsIEffectiveTLDService);
	var Preferences           = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch("extensions.smart-referer.");
	var DefaultPreferences    = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getDefaultBranch("extensions.smart-referer.");

	DefaultPreferences.setBoolPref("strict", true);

	function modify (http) {
		try {
			http.QueryInterface(Ci.nsIChannel);

			var referer = NetworkIO.newURI(http.getRequestHeader("Referer"), null, null);
		}
		catch (e) {
			return false;
		}

		try {
			var [fromURI, toURI] = [http.URI.clone(), referer.clone()];

			if (fromURI.host == toURI.host) {
				return false;
			}

			try {
				var isIP = false;

				EffectiveTLDService.getPublicSuffix(fromURI);
				EffectiveTLDService.getPublicSuffix(toURI);
			}
			catch (e) {
				if (e == Cr.NS_ERROR_HOST_IS_IP_ADDRESS) {
					isIP = true;
				}
			}

			if (!isIP) {
				if (!Preferences.getBoolPref("strict")) {
					let [from, to] = [fromURI, toURI].map(function (x) x.host.split('.').reverse());
					let index      = 0;

					while (from[index] || to[index]) {
						if (from[index] == to[index]) {
							index++;
						}
						else {
							from.splice(index);
							to.splice(index);
						}
					}

					if (from.length == 0) {
						throw Cr.NS_ERROR_DOM_BAD_URI;
					}

					fromURI.host = from.reverse().join('.');
					toURI.host   = to.reverse().join('.');
				}

				try {
					if (EffectiveTLDService.getPublicSuffix(fromURI) == fromURI.host) {
						throw Cr.NS_ERROR_DOM_BAD_URI;
					}
				}
				catch (e) {
					if (e == Cr.NS_ERROR_DOM_BAD_URI) {
						throw e;
					}
				}
			}

			ScriptSecurityManager.checkSameOriginURI(fromURI, toURI, false);

			return false;
		}
		catch (e) {
			http.referrer = null;
			http.setRequestHeader("Referer", null, false);

			return true;
		}
	}

	c.prototype.observe = function (subject, topic, data) {
		if (topic == "http-on-modify-request") {
			modify(subject.QueryInterface(Ci.nsIHttpChannel));
		}
	}

	c.prototype.start = function () {
		Observer.addObserver(this, "http-on-modify-request", false);
	}

	c.prototype.stop = function () {
		Observer.removeObserver(this, "http-on-modify-request");
	}

	return new c();
})();

function startup (data, reason) {
	spoofer.start();
}

function shutdown (data, reason) {
	spoofer.stop();
}
