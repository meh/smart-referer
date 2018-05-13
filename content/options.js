// Some helper code for integrating more nicely with `wext-options`
const OPTION_HOOKS = {
	"ui-icon-color-mode": function(option, api) {
		option.onUserChange.addListener((event) => {
			api.options["ui-icon-color-custom"].target.focus();
		});
	},
	
	"ui-icon-color-custom": function(option, api) {
		function updateColorPreview(color) {
			let DOMCustomPreview = document.getElementById("option_ui_icon_color_custom_preview");
			DOMCustomPreview.style.backgroundColor = color;
			
			api.options["ui-icon-color-mode"].value = "custom";
			api.options["ui-icon-color-mode"].triggerUserChange();
		}
		
		option.onStorageChange.addListener((event) => {
			updateColorPreview(event.value);
		});
		
		option.onUserChange.addListener((event) => {
			updateColorPreview(event.value);
		});
		
		api.onReady.addListener((event) => {
			updateColorPreview(option.value);
		});
	},
	
	"allow": function(option, api) {
		function rebuildUI(data) {
			let DOMTable = document.getElementById("option_allow_display");
			
			// Clear current table entries
			let range = document.createRange();
			range.selectNodeContents(DOMTable);
			range.deleteContents();
			
			// Add all table entries from data
			for(let entry of data.split(/\s+/)) {
				if(!entry) {
					continue;
				}
				
				let source, destination;
				if(entry.includes(">")) {
					[source, destination] = entry.split(">", 2);
				} else {
					[source, destination] = ["*", entry];
				}
				
				let DOMRow = document.createElement("tr");
				DOMRow.setAttribute("data-source", entry);
				
				let DOMColSource = document.createElement("td");
				DOMColSource.appendChild(document.createTextNode(source));
				DOMRow.appendChild(DOMColSource);
				
				let DOMColDestination = document.createElement("td");
				DOMColDestination.appendChild(document.createTextNode(destination));
				DOMRow.appendChild(DOMColDestination);
				
				let DOMColRemove = document.createElement("td");
				let DOMBtnRemove = document.createElement("button");
				DOMBtnRemove.title       = browser.i18n.getMessage("options_item_remove.title")
				DOMBtnRemove.textContent = browser.i18n.getMessage("options_item_remove")
				DOMBtnRemove.textContent = DOMBtnRemove.textContent?DOMBtnRemove.textContent:"➖";
				DOMColRemove.appendChild(DOMBtnRemove);
				DOMRow.appendChild(DOMColRemove);
				
				DOMTable.appendChild(DOMRow);
				
				DOMBtnRemove.addEventListener("click", (event) => {
					// Find the actual data token that caused the clicked row to be generated
					let entry = event.target.parentNode.parentNode.getAttribute("data-source");
					
					// Construct new data value without the entry
					let value = option.value.split(/\s+/).filter(item => (item !== entry)).join(" ");
					
					// Write the new data value
					option.value = value;
					option.triggerUserChange();
					
					// Update table
					rebuildUI(value);
				});
			}
		}
		
		let DOMEntrySource      = document.getElementById("option_allow_new_source");
		let DOMEntryDestination = document.getElementById("option_allow_new_destination");
		document.getElementById("option_allow_new_form").addEventListener("submit", (event) => {
			event.preventDefault();
			
			// Format of the entries has already been validated by the browser 🙂
			let value = `${option.value} ${DOMEntrySource.value}>${DOMEntryDestination.value}`;
			
			// Write the new data value
			option.value = value;
			option.triggerUserChange();
			
			// Update table
			rebuildUI(value);
			
			// Clear input fields
			DOMEntrySource.value      = "";
			DOMEntryDestination.value = "";
		});
		
		
		option.onStorageChange.addListener((event) => {
			rebuildUI(event.value);
		});
		
		api.onReady.addListener((event) => {
			rebuildUI(option.value);
		});
	},
	
	
	"whitelist-default" : function(option, api) {
		api.onReady.addListener((event) => {
			document.getElementById("options_whitelist_default_label").innerHTML =
					browser.i18n.getMessage("options_whitelist_default_label", WHITELIST_DEFAULT_URL);
		});
	},
	
	
	"whitelist-sources" : function(option, api) {
		function rebuildUI(data) {
			let DOMTable = document.getElementById("option_whitelist_display");
			
			// Clear current table entries
			let range = document.createRange();
			range.selectNodeContents(DOMTable);
			range.deleteContents();
			
			// Add all table entries from data
			for(let whitelistURL of data) {
				let DOMRow = document.createElement("tr");
				DOMRow.setAttribute("data-source", whitelistURL);
				
				let DOMColURL = document.createElement("td");
				DOMColURL.appendChild(document.createTextNode(whitelistURL));
				DOMRow.appendChild(DOMColURL);
				
				let DOMColRemove = document.createElement("td");
				let DOMBtnRemove = document.createElement("button");
				DOMBtnRemove.title       = browser.i18n.getMessage("options_item_remove.title")
				DOMBtnRemove.textContent = browser.i18n.getMessage("options_item_remove")
				DOMBtnRemove.textContent = DOMBtnRemove.textContent?DOMBtnRemove.textContent:"➖";
				DOMColRemove.appendChild(DOMBtnRemove);
				DOMRow.appendChild(DOMColRemove);
				
				DOMTable.appendChild(DOMRow);
				
				DOMBtnRemove.addEventListener("click", (event) => {
					// Find the actual data token that caused the clicked row to be generated
					let entry = event.target.parentNode.parentNode.getAttribute("data-source");
					
					// Write new data value without the entry
					option.value = option.value.filter(item => (item !== entry));
					option.triggerUserChange();
					
					// Update table
					rebuildUI(option.value);
				});
			}
		}
		
		let DOMEntryURL = document.getElementById("option_whitelist_new_url");
		document.getElementById("option_whitelist_new_form").addEventListener("submit", (event) => {
			event.preventDefault();
			
			// Ass the new data value to storage
			option.value.push(DOMEntryURL.value);
			option.triggerUserChange();
			
			// Update table
			rebuildUI(option.value);
			
			// Clear input fields
			DOMEntryURL.value = "";
		});
		
		
		option.onStorageChange.addListener((event) => {
			rebuildUI(event.value);
		});
		
		api.onReady.addListener((event) => {
			rebuildUI(option.value);
		});
	},
	
	
	"mode": function(option, api) {
		function onChange(event) {
			if(event.value === "user") {
				document.getElementById("option_referer").disabled = false;
			} else {
				document.getElementById("option_referer").disabled = true;
			}
		}
		option.onUserChange.addListener(onChange);
		option.onStorageChange.addListener(onChange);
		
		api.onReady.addListener((event) => {
			onChange({ value: option.value });
		});
	}
};
