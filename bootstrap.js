/*
 *           DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
 *                   Version 2, December 2004
 *
 *           DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
 *  TERMS AND CONDITIONS FOR COPYING, DISTRIBUTION AND MODIFICATION
 *
 *  0. You just DO WHAT THE FUCK YOU WANT TO.
 *********************************************************************/

spoofer = (function () {
	var c = function () {};

	var Observer              = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
	var NetworkIO             = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
	var ScriptSecurityManager = Components.classes["@mozilla.org/scriptsecuritymanager;1"].getService(Components.interfaces.nsIScriptSecurityManager);
	var EffectiveTLDService   = Components.classes["@mozilla.org/network/effective-tld-service;1"].getService(Components.interfaces.nsIEffectiveTLDService);
	var Preferences           = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.smart-referer.");
	var DefaultPreferences    = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getDefaultBranch("extensions.smart-referer.");

	var Interfaces = {
		Channel:               Components.interfaces.nsIChannel,
		HTTPChannel:           Components.interfaces.nsIHttpChannel,
		Supports:              Components.interfaces.nsISupports,
		Observer:              Components.interfaces.nsIObserver,
		SupportsWeakReference: Components.interfaces.nsISupportsWeakReference
	};

	DefaultPreferences.setBoolPref("strict", true);

	function modify (http) {
		try {
			http.QueryInterface(Interfaces.Channel);

			var referer = NetworkIO.newURI(http.getRequestHeader("Referer"), null, null);
		}
		catch (e) {
			return false;
		}

		try {
			var [fromURI, toURI] = [http.URI.clone(), referer.clone()];

			try {
				var isIP = false;

				EffectiveTLDService.getPublicSuffix(fromURI);
				EffectiveTLDService.getPublicSuffix(toURI);
			}
			catch (e) {
				if (e == NS_ERROR_HOST_IS_IP_ADDRESS) {
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
						throw Components.results.NS_ERROR_DOM_BAD_URI;
					}

					fromURI.host = from.reverse().join('.');
					toURI.host   = to.reverse().join('.');
				}

				try {
					if (EffectiveTLDService.getPublicSuffix(fromURI) == fromURI.host) {
						throw Components.results.NS_ERROR_DOM_BAD_URI;
					}
				}
				catch (e) {
					if (e == Components.results.NS_ERROR_DOM_BAD_URI) {
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
			modify(subject.QueryInterface(Interfaces.HTTPChannel));
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
