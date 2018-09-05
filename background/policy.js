/**
 * Policy matching engine
 */
const Policy = (function () {
	function wildcard (string) {
		// Escape special characters that are special in regular expressions
		// Do not escape "[" and "]" so that simple character classes are still possible
		string = string.replace(/(\\|\^|\$|\{|\}|\(|\)|\+|\||\<|\>|\&|\.)/g, "\\$1");
		// Substitute remaining special characters for their wildcard meanings
		string = string.replace(/\*/g, ".*?").replace(/\?/g, ".");
		// Compile regular expression object
		return new RegExp("^" + string + "$");
	}

	var c = function (string) {
		this.list = [];

		for(let line of string.split(/\n/g)) {
			line = line.trim();
			
			if(line.startsWith("#") || line.length < 1) {
				continue;
			}
			
			for(let item of line.split(/\s+/g)) {
				try {
					let parts = item.split(">");
					if(parts.length == 2) {
						this.list.push({
							from: wildcard(from),
							to:   wildcard(to)
						});
					}
				} catch(e) {
					console.error(`[Smart Referer] Failed to parse whitelist rule "${item}": ${e}`);
				}
			}
		}
	};
	
	c.prototype.extend = function (items) {
		this.list.push.apply(this.list, items.list);
	};
	
	c.prototype.allows = function (from, to) {
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
 * Decide whether the given combination of source and target URLs is allowed to keep its referer
 * or not
 *
 * @param {String}  from
 *        The source URL (or current referer of the target page)
 * @param {String}  to
 *        The URL of the target page or object
 * @param {Policy}  policy
 *        The pre-compiled referer policy based on the current whitelist
 * @param {Boolean} isStrict
 *        Whether different sub-domains of the same base domain should be considered to be different
 *        hosts or not
 */
function isURICombinationBlocked(from, to, policy, isStrict) {
	try {
		let toURI   = new URL(to);
		let fromURI = new URL(from);
		
		// Check if this request can be dismissed early by either being a perfect
		// source host / target host match OR by being whitelisted somewhere
		if(fromURI.host === toURI.host || policy.allows(fromURI.host, toURI.host)) {
			return false;
		}
	
		// Attempt lax matching only if we, in fact, have hostnames and not IP addresses
		let isIPAddress = !isHostnameIPAddress(fromURI.host) && !isHostnameIPAddress(toURI.host);
		if(isIPAddress && !isStrict) {
			// Parse the domain names and look for each of their base domains
			let fromHostBase = psl.get(fromURI.host);
			let toHostBase   = psl.get(toURI.host);
		
			// Allow if the both base domain names match
			if(fromHostBase && toHostBase && fromHostBase === toHostBase) {
				return false;
			}
		}
	} catch(e) {
		console.exception(e);
	}
	
	return true;
}


/**
 * Generate the referer to use for the given target page or other web object
 *
 * @param {String} from
 *        The current referer value of the target page
 * @param {String} to
 *        The URL of the target page or object
 * @param {Policy} policy
 *        The pre-compiled referer policy based on the current whitelist
 * @param {Object} options
 *        The values of the `enable`, `strict`, `mode` & `referer` extension options
 */
function determineUpdatedReferer(referer, target, policy, options) {
	if(!options["enable"]) {
		return null;
	}
	
	if(!referer) {
		return null;
	}
	
	if(!isURICombinationBlocked(referer, target, policy, options["strict"])) {
		return null;
	}
	
	switch(options["mode"]) {
		case "direct":
			return '';
		break;
		
		case "self":
			return target;
		break;
		
		default:
			return options["referer"];
	}
}
