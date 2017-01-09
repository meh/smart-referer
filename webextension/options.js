// Some helper code for integrating more nicely with `wext-options`
const OPTION_HOOKS = {
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
