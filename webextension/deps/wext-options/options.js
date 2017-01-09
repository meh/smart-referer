(function() {
	"use strict";


	function isDOMNodeFormElement(DOMNode) {
		return (DOMNode.tagName === "INPUT" || DOMNode.tagName === "SELECT" || DOMNode.tagName === "TEXTAREA");
	}


	function makeEventTarget() {
		let callbacks = new Set();
		return [
			{
				addListener: function(callback) {
					callbacks.add(callback);
				},
			
				removeListener: function(callback) {
					callbacks.remove(callback);
				},
			
				hasListener: function(callback) {
					return callbacks.has(callback);
				}
			},
		
			function(event) {
				for(let callback of callbacks) {
					try {
						callback(event);
					} catch(error) {
						console.exception(error);
					}
				}
			}
		];
	}


	function makePrivate() {
		const items = new WeakMap();
	
		return function p(target) {
			if(typeof(target) !== "object" || !target) {
				return target;
			}
		
			if(!items.has(target)) {
				items.set(target, Object.create(p(Object.getPrototypeOf(target) || null)));
			}
		
			return items.get(target);
		};
	}


	const TYPES = {
		"checkbox": {
			getDefault: function(DOMNode) {
				return DOMNode.defaultChecked;
			},
		
			getValue: function(DOMNode) {
				return DOMNode.checked;
			},
		
			setValue: function(DOMNode, value) {
				DOMNode.checked = value;
			}
		},
	
		"color": {
			getDefault: function(DOMNode) {
				return (DOMNode.defaultValue ? DOMNode.defaultValue : "#000000");
			},
		
			getValue: function(DOMNode) {
				return DOMNode.value;
			},
		
			setValue: function(DOMNode, value) {
				DOMNode.value = value;
			}
		},
	
		"number": {
			getDefault: function(DOMNode) {
				let defaultValue = parseFloat(DOMNode.defaultValue);
				return (!isNaN(defaultValue) ? defaultValue : 0);
			},
		
			getValue: function(DOMNode) {
				return DOMNode.value;
			},
		
			setValue: function(DOMNode, value) {
				DOMNode.value = value;
			}
		},
	
		"range": {
			getDefault: function(DOMNode) {
				let defaultValue = parseFloat(DOMNode.defaultValue);
				return (!isNaN(defaultValue) ? defaultValue : 0);
			},
		
			getValue: function(DOMNode) {
				return DOMNode.value;
			},
		
			setValue: function(DOMNode, value) {
				DOMNode.value = value;
			}
		},
	
		"radio": {
			getSelected: function(DOMNode, defaultSelection) {
				for(let DOMRadio of document.getElementsByName(DOMNode.name)) {
					if(( defaultSelection && DOMRadio.defaultChecked)
					|| (!defaultSelection && DOMRadio.checked)) {
						return DOMRadio;
					}
				}
				return DOMNode;
			},
		
			getDefault: function(DOMNode) {
				if(DOMNode.name) {
					return TYPES["radio"].getSelected(DOMNode, true).value;
				} else {
					return DOMNode.value;
				}
			},
		
			getValue: function(DOMNode) {
				return TYPES["radio"].getSelected(DOMNode).value;
			},
		
			setValue: function(DOMNode, value) {
				for(let DOMRadio of document.getElementsByName(DOMNode.name)) {
					if(DOMRadio.value === value) {
						DOMRadio.checked = true;
					} else {
						DOMRadio.checked = false;
					}
				}
			}
		},
	
		"text": {
			getDefault: function(DOMNode) {
				return DOMNode.defaultValue;
			},
		
			getValue: function(DOMNode) {
				return DOMNode.value;
			},
		
			setValue: function(DOMNode, value) {
				DOMNode.value = value;
			}
		},
	
		"url": {
			getDefault: function(DOMNode) {
				return DOMNode.defaultValue;
			},
		
			getValue: function(DOMNode) {
				return DOMNode.value;
			},
		
			setValue: function(DOMNode, value) {
				DOMNode.value = value;
			}
		},
	
		"select": {
			getDefault: function(DOMNode) {
				let DOMDefaultOption = null;
				for(let DOMOption of DOMNode.querySelectorAll("option")) {
					if(DOMOption.defaultSelected) {
						DOMDefaultOption = DOMOption;
						break;
					} else if(!DOMDefaultOption) {
						DOMDefaultOption = DOMOption;
					}
				}
				return (DOMDefaultOption ? DOMDefaultOption.value : null);
			},
		
			getValue: function(DOMNode) {
				return DOMNode.value;
			},
		
			setValue: function(DOMNode, value) {
				DOMNode.value = value;
			}
		}
	};

	document.addEventListener("DOMContentLoaded", function() {
		// Reloading the add-on while it add-on page is open often causes spurious errors
		// because the global `browser` object goes missing
		if(typeof(browser) === "undefined") {
			window.location.reload();
			return;
		}
		
		const p = makePrivate();
	
		let [readyEvent, readyEventTrigger] = makeEventTarget();
		let api = {
			options: null,
		
			onReady: readyEvent
		};
	
		// Parse the options web page and obtain all the relevant information about the
		// available option items
		let hooks   = OPTION_HOOKS || {};
		let options = {};
		for(let DOMOption of document.querySelectorAll("body > *[data-option]")) {
			let name = DOMOption.getAttribute("data-option");
		
			// Find option value form element
			let DOMOptionTargetContainer = DOMOption;
			let DOMOptionTarget = null;
			if(DOMOption.hasAttribute("data-option-id")) {
				DOMOptionTarget = document.getElementById(DOMOption.getAttribute("data-option-id"));
			} else {
				while(true) {
					// Search for option storage object
					for(let DOMNode of DOMOptionTargetContainer.children) {
						if(DOMNode.classList.contains("value")) {
							// DOM objects with a "value" class are usually containers for
							// another object
							DOMOptionTarget = DOMNode;
							break;
						} else if(isDOMNodeFormElement(DOMNode)) {
							if(!DOMOptionTarget) {
								DOMOptionTarget = DOMNode;
							}
						}
					}
					if(!DOMOptionTarget) {
						break;
					}
			
					// Assume that option target was actually a container of another form element
					if(!isDOMNodeFormElement(DOMOptionTarget)) {
						DOMOptionTargetContainer = DOMOptionTarget;
						DOMOptionTarget          = null;
					} else {
						break;
					}
				}
			}
			if(!DOMOptionTarget) {
				console.error(`Option "${name}" does not contain a value storage element`);
				continue;
			}
		
			// Determine type of option
			let type = DOMOption.getAttribute("data-option-type");
			if(!type) {
				if(DOMOptionTarget.tagName === "SELECT") {
					type = "select";
				} else if(DOMOptionTarget.tagName === "TEXTAREA") {
					type = "text";
				} else if(DOMOptionTarget.hasAttribute("type")) {
					type = DOMOptionTarget.getAttribute("type");
					if(type === "hidden") {
						// <input type="hidden" /> may be used if the consumer implements a
						// a custom UI and wishes to use us only for event management.
						type = "text";
					}
				} else {
					type = "text";
				}
			}
			if(!(type in TYPES)) {
				console.error(`Option "${name}" has invalid/unknown type: ${type}`);
				continue;	
			}
		
			// Create event objects that we are going to use
			let [userChangeEvent,    userChangeEventTrigger]    = makeEventTarget();
			let [storageChangeEvent, storageChangeEventTrigger] = makeEventTarget();
		
			let option = {
				name:   name,
				target: DOMOptionTarget,
				type:   type,
			
				onUserChange:    userChangeEvent,
				onStorageChange: storageChangeEvent,
				
				triggerUserChange: (origEvent) => {
					let event = new Event("user-change");
					let value = TYPES[type].getValue(DOMOptionTarget);
					Object.defineProperties(event, {
						"target":   { enumerable: true, value: options[name] },
						"value":    { enumerable: true, value: value         },
						"original": { enumerable: true, value: origEvent     }
					});
			
					userChangeEventTrigger(event);
				},
			
				get defaultValue() {
					if(DOMOption.hasAttribute("data-option-default")) {
						return DOMOption.getAttribute("data-option-default");
					} else {
						return TYPES[type].getDefault(DOMOptionTarget);
					}
				},
			
				get value() {
					return TYPES[type].getValue(DOMOptionTarget);
				},
				set value(value) {
					return TYPES[type].setValue(DOMOptionTarget, value);
				}
			};
			p(option).onUserChangeTrigger    = userChangeEventTrigger;
			p(option).onStorageChangeTrigger = storageChangeEventTrigger;
			
			// Forward changes on the target object to our event system
			DOMOptionTarget.addEventListener("change", option.triggerUserChange, false);
			
			// Run hook for this option
			if(hooks.hasOwnProperty(name)) {
				try {
					hooks[name](option, api);
				} catch(error) {
					console.exception(error);
				}
			}
		
			options[name] = option;
		}
		api["options"] = options;
	
	
		browser.storage.local.get().then((items) => {
			let expectedStorageChanges = new Set();
			for(let name of Object.keys(options)) {
				if(items.hasOwnProperty(name)) {
					options[name].value = items[name];
				} else {
					options[name].value = options[name].defaultValue;
				}
			
				options[name].onUserChange.addListener(function(event) {
					let mapping = {};
					mapping[event.target.name] = event.value;
				
					expectedStorageChanges.add(event.target.name);
					browser.storage.local.set(mapping).catch(console.exception);
				});
			}
		
			browser.storage.onChanged.addListener(function(changes, areaName) {
				if(areaName !== "local") {
					return;
				}
			
				for(let name of Object.keys(changes)) {
					if(expectedStorageChanges.has(name)) {
						expectedStorageChanges.delete(name);
						continue;
					}
				
					// Dispatch event about this change in the browser's storage
					let event = new Event("storage-change", {"cancelable": true});
					Object.defineProperties(event, {
						"target": { enumerable: true, value: options[name]          },
						"value":  { enumerable: true, value: changes[name].newValue }
					});
					p(options[name]).onStorageChangeTrigger(event);
				
					// Allow event client to stop us from updating the user-visible value display
					// because of this event
					if(!event.defaultPrevented) {
						if(typeof(changes[name].newValue) !== "undefined") {
							options[name].value = changes[name].newValue;
						} else {
							options[name].value = options[name].defaultValue;
						}
					}
				}
			});
		
			let event = new Event("ready");
			Object.defineProperties(event, {
				"target": { enumerable: true, value: api }
			});
			readyEventTrigger(event);
		}).catch(console.exception);
	});
})();
