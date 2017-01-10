// Wrapper for old storage API in FireFox 45 – 48
if(browser.storage.local.get([], () => {}) === undefined) {
	let _storage_get = browser.storage.local.get;
	let _storage_set = browser.storage.local.set;
	
	browser.storage.local.get = function(keys) {
		// List of storage keys is mandatory in this browser version
		if(!keys) {
			keys = Object.keys(OPTIONS_DEFAULT);
		}
		
		// Interestingly enough the browser actually resolves the internally returned promise
		// and calls a (non-standard) callback parameter instead
		return new Promise((callback, errback) => {
			_storage_get(keys, callback);
		});
	}
	
	browser.storage.local.set = function(options) {
		// Interestingly enough the browser actually resolves the internally returned promise
		// and calls a (non-standard) callback parameter instead
		return new Promise((callback, errback) => {
			_storage_set(options, callback);
		});
	}
}
