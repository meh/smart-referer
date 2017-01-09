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
