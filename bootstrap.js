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

var Spoofer = (function () {
	var c = function () {};

	var Observer              = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService),
	    NetworkIO             = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService),
	    ScriptSecurityManager = Cc["@mozilla.org/scriptsecuritymanager;1"].getService(Ci.nsIScriptSecurityManager),
	    EffectiveTLDService   = Cc["@mozilla.org/network/effective-tld-service;1"].getService(Ci.nsIEffectiveTLDService),
	    Preferences           = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch("extensions.smart-referer."),
	    DefaultPreferences    = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getDefaultBranch("extensions.smart-referer.");

	DefaultPreferences.setBoolPref("strict", true);
	DefaultPreferences.setCharPref("mode", "direct");
	DefaultPreferences.setCharPref("referer", "");
	DefaultPreferences.setCharPref("whitelist.to", "");
	DefaultPreferences.setCharPref("whitelist.from", "");

	function can (what, domain) {
		var whitelist = Preferences.getCharPref(what == "receive" ? "whitelist.to" : "whitelist.from").split(/[;,\s]+/)

		for (var i = 0; i < whitelist.length; i++) {
			if (!whitelist[i]) {
				continue;
			}

			if (domain.match(new RegExp(whitelist[i]))) {
				return true;
			}
		}

		return false;
	}

	c.prototype.observe = function (subject, topic, data) {
		if (topic == "http-on-modify-request") {
			var http    = subject.QueryInterface(Ci.nsIHttpChannel),
			    referer = http.getRequestHeader("Referer");

			if (!referer) {
				return false;
			}

			referer = NetworkIO.newURI(referer, null, null);

			try {
				var toURI   = http.URI.clone(),
						fromURI = referer.clone();

				if (fromURI.host == toURI.host || can("send", fromURI.host) || can("receive", toURI.host)) {
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
				var mode = Preferences.getCharPref("mode").trim();

				if (mode == "direct") {
					referer = null;
				}
				else if (mode == "self") {
					referer = http.URI;
				}
				else {
					referer = Preferences.getCharPref("referer");
				}

				if (typeof(referer) === "string") {
					http.setRequestHeader("Referer", referer, false);
				}
				else {
					http.referrer = referer;
				}

				return true;
			}
		}
	}

	c.prototype.start = function () {
		Observer.addObserver(this, "http-on-modify-request", false);
	}

	c.prototype.stop = function () {
		Observer.removeObserver(this, "http-on-modify-request");
	}

	return c;
})();

var spoofer;

function startup (data, reason) {
	spoofer = new Spoofer();
	spoofer.start();
}

function shutdown (data, reason) {
	spoofer.stop();
}
