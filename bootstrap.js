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

var Allow = (function () {
	function wildcard (string) {
		return new RegExp("^" + string.replace(/\./g, "\\.").replace(/\*/g, ".*?").replace(/\?/g, ".") + "$");
	}

	var c = function (string) {
		var list = []

		string.split(/\n/).filter(function (s) s).forEach(function (part) {
			part.replace(/#.*$/, '').split(/\s+/).filter(function (s) s).forEach(function (part) {
				try {
					if (part.indexOf(">") == -1) {
						list.push({
							from: wildcard("*"),
							to:   wildcard(part)
						});
					}
					else {
						var [from, to] = part.split(">");

						list.push({
							from: wildcard(from),
							to:   wildcard(to)
						});
					}
				} catch (e) {}
			});
		});

		this.list = list;
	};

	c.prototype.it = function (from, to) {
		for (var i = 0; i < this.list.length; i++) {
			var matchers = this.list[i];

			if (matchers.from.test(from) && matchers.to.test(to)) {
				return true;
			}
		}

		return false;
	};

	return c;
})();

var Spoofer = (function () {
	var c = function () {};

	var Observer              = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService),
	    Timer                 = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer),
	    NetworkIO             = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService),
	    ScriptSecurityManager = Cc["@mozilla.org/scriptsecuritymanager;1"].getService(Ci.nsIScriptSecurityManager),
	    EffectiveTLDService   = Cc["@mozilla.org/network/effective-tld-service;1"].getService(Ci.nsIEffectiveTLDService),
	    Preferences           = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch("extensions.smart-referer."),
	    DefaultPreferences    = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getDefaultBranch("extensions.smart-referer.");

	DefaultPreferences.setBoolPref("strict", false);
	DefaultPreferences.setCharPref("mode", "self");
	DefaultPreferences.setCharPref("referer", "");

	// whitelisting
	DefaultPreferences.setCharPref("allow", "");
	DefaultPreferences.setCharPref("whitelist", "http://meh.github.io/smart-referer/whitelist.txt");

	var allows = new Allow(Preferences.getCharPref("allow"));

	// backward compatibility
	DefaultPreferences.setCharPref("whitelist.to", "");
	DefaultPreferences.setCharPref("whitelist.from", "");

	function toRegexpArray (string) {
		return string.split(/[;,\s]+/).map(function (s) {
			if (s == 0) {
				return null;
			}

			try {
				return new RegExp(s);
			}
			catch (e) {
				return null;
			}
		}).filter(function (s) { return s; });
	}

	var whitelist = {
		to:   toRegexpArray(Preferences.getCharPref("whitelist.to")),
		from: toRegexpArray(Preferences.getCharPref("whitelist.from"))
	};

	function can (what, from, to) {
		if (what === "go") {
			return allows.it(from, to);
		}
		else {
			let domain = from;
			let list   = whitelist[what == "receive" ? "to" : "from"];

			for (let i = 0; i < list.length; i++) {
				if (list[i].test(domain)) {
					return true;
				}
			}

			return false;
		}
	}

	function loadWhitelist() {
		var url = Preferences.getCharPref("whitelist");

		if (!url) {
			return;
		}

		var request = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Ci.nsIXMLHttpRequest);

		request.onload = function() {
			allows = new Allow(Preferences.getCharPref("allow") + " " + this.responseText);
		};

		request.onerror = function() {
			dump("Smart Referer: failed to fetch " + url);
			dump("\n");
		}

		request.open('GET', url, true);
		request.send();
	}

	c.prototype.observe = function (subject, topic, data) {
		if (topic == "http-on-modify-request") {
			var http = subject.QueryInterface(Ci.nsIHttpChannel),
			    referer;

			try {
				referer = NetworkIO.newURI(http.getRequestHeader("Referer"), null, null);
			}
			catch (e) {
				return false;
			}

			try {
				var toURI   = http.URI.clone(),
						fromURI = referer.clone();

				if (fromURI.host == toURI.host || can("go", fromURI.host, toURI.host) ||
				    can("send", fromURI.host) || can("receive", toURI.host)) {
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
						let [from, to] = [fromURI, toURI].map(function (x) x.host.split(".").reverse());
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

						fromURI.host = from.reverse().join(".");
						toURI.host   = to.reverse().join(".");
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
		else if (topic == "nsPref:changed") {
			if (data == "allow" || data == "whitelist") {
				loadWhitelist();
			}
			else if (data == "whitelist.to") {
				whitelist.to = toRegexpArray(Preferences.getCharPref("whitelist.to"));
			}
			else if (data == "whitelist.from") {
				whitelist.from = toRegexpArray(Preferences.getCharPref("whitelist.from"));
			}
		}
	}

	c.prototype.start = function () {
		Observer.addObserver(this, "http-on-modify-request", false);

		Preferences.addObserver("allow", this, false);
		Preferences.addObserver("whitelist", this, false);
		Preferences.addObserver("whitelist.to", this, false);
		Preferences.addObserver("whitelist.from", this, false);

		Timer.initWithCallback(loadWhitelist, 86400000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
		loadWhitelist();
	}

	c.prototype.stop = function () {
		Observer.removeObserver(this, "http-on-modify-request");

		Preferences.removeObserver("allow", this);
		Preferences.removeObserver("whitelist", this);
		Preferences.removeObserver("whitelist.to", this);
		Preferences.removeObserver("whitelist.from", this);

		Timer.cancel();
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
