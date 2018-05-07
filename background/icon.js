"use strict";

function generateIconTitle(enabled) {
	let titleMsgID = "icon_title_" + (enabled ? "enabled" : "disabled");
	return browser.runtime.getManifest().name + " – " + browser.i18n.getMessage(titleMsgID);
}

class BrowserActionIcon {
	constructor() {
		this._supportsIconReset   = false;
		this._isEnabled           = true;
		this._enableIconOverride  = null;
		this._disableIconOverride = null;
		
		// Sniff for browsers supporting resetting the browserAction icon instead of just overriding it
		if(typeof(browser.browserAction.setIcon)  === "function"
		&& typeof(browser.runtime.getBrowserInfo) === "function") {
			browser.runtime.getBrowserInfo().then((result) => {
				if(result.name === "Firefox" && parseInt(result.version.split(".")[0]) >= 59) {
					this._supportsIconReset = true;
				}
			});
		}
	}
	
	refresh() {
		//COMPAT: Firefox for Android 56+
		if(typeof(browser.browserAction.setIcon) !== "function") {
			return;
		}
		
		if(this._isEnabled) {
			if(this._enableIconOverride) {
				browser.browserAction.setIcon(this._enableIconOverride);
			} else if(this._supportsIconReset) {
				// Prefer to reset the browserAction icon instead of overring it so that the
				// theme-specific theme_icons declared in the manifest can be used
				browser.browserAction.setIcon({
					path: null
				});
			} else {
				// Fallback to overriding the current icon with the default icon
				// (theme-specific icons in manifest will be ignored)
				browser.browserAction.setIcon({
					path: {
						// Use hand-rastorized icon for 16x16
						16:  "assets/icon-enabled.16x16.png",
						// SVG-scaling for well-enough for larger sizes
						256: "assets/icon-enabled.svg"
					}
				});
			}
		} else {
			if(this._disableIconOverride) {
				browser.browserAction.setIcon(this._disableIconOverride);
			} else {
				browser.browserAction.setIcon({
					path: {
						// Use hand-rastorized icon for 16x16
						16:  "assets/icon-disabled.16x16.png",
						// SVG-scaling for well-enough for larger sizes
						256: "assets/icon-disabled.svg"
					}
				});
			}
		}
	}
	
	setEnabled() {
		this._isEnabled = true;
		this.refresh();
	}
	
	setDisabled() {
		this._isEnabled = false;
		this.refresh();
	}
	
	overrideEnableIcon(iconData = null) {
		this._enableIconOverride = iconData;
		this.refresh();
	}
	
	overrideDisableIcon(iconData = null) {
		this._disableIconOverride = iconData;
		this.refresh();
	}
}

const browserActionIcon = new BrowserActionIcon();


// Monitor settings for changes to the request processing setting
browser.storage.onChanged.addListener((changes, areaName) => {
	for(let name of Object.keys(changes)) {
		if(areaName === "local" && name === "enable") {
			if(changes[name].newValue === true) {
				browserActionIcon.setEnabled();
				browser.browserAction.setTitle({ title: generateIconTitle(true) });
			} else {
				browserActionIcon.setDisabled();
				browser.browserAction.setTitle({ title: generateIconTitle(false) });
			}
		}
	}
});

browser.browserAction.onClicked.addListener((tab) => {
	browser.storage.local.get(["enable"]).then((result) => {
		return browser.storage.local.set({ enable: !result.enable });
	}).catch(console.exception);
});

function loadImageURLAsImageData(url) {
	return new Promise((resolve, reject) => {
		let DOMImage = new Image();
		DOMImage.onload = function() {
			try {
				// Create canvas of image size
				let canvas = document.createElement("canvas");
				canvas.width  = this.naturalWidth;
				canvas.height = this.naturalHeight;
				
				// Copy image contents to canvas
				let ctx = canvas.getContext("2d");
				ctx.drawImage(this, 0, 0);
				
				// Copy image contents as `ImageData` from canvas
				resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
			} catch(error) {
				reject(error);
			}
		};
		DOMImage.onerror = (event) => {
			reject(new Error(`Failed to load image: ${url}`));
		};
		DOMImage.src = url;
	});
}

async function processThemeInfo(theme) {
	if(typeof(theme.colors) !== "object" || !theme.colors.textcolor) {
		browserActionIcon.overrideEnableIcon(null);
		return false;
	}
	
	// Extract text color from theme data
	let textColorParts = theme.colors.textcolor.match(/#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/);
	if(!textColorParts) {
		browserActionIcon.overrideEnableIcon(null);
		return false;
	}
	let textColor = [
		parseInt(textColorParts[1], 16),
		parseInt(textColorParts[2], 16),
		parseInt(textColorParts[3], 16),
	];
	
	// Select the expected image paths based on whether this is a dark or a light text color
	let isLiteColor = (((textColor[0] + textColor[1] + textColor[2]) / 3) >= 128);
	let imgPaths = {
		"16x16":    `assets/${isLiteColor ? "icon-enabled-lite.16x16.png" : "icon-enabled.16x16.png"}`,
		"scalable": `assets/${isLiteColor ? "icon-enabled-lite.svg"       : "icon-enabled.svg"}`,
	};
	
	// Load each path in its preferred format
	let [img16x16Data, imgSvgXml] = await Promise.all([
		loadImageURLAsImageData(imgPaths["16x16"]),
		fetch(imgPaths["scalable"]).then((response) => {
			return response.text();
		}).then((content) => {
			return (new DOMParser()).parseFromString(content, "image/svg+xml");
		}),
	]);
	
	// Replace the color in each pixel in the 16x16 bitmap image
	for(let idx = 0; idx < img16x16Data.data.length; idx += 4) {
		img16x16Data.data[idx + 0] = textColor[0];
		img16x16Data.data[idx + 1] = textColor[1];
		img16x16Data.data[idx + 2] = textColor[2];
		// …leave Alpha as-is
	}
	
	// Replace output color transformation matrix in the SVG's output filter
	let colorMatrix = `
		0 0 0 0 ${textColor[0] / 255}
		0 0 0 0 ${textColor[1] / 255}
		0 0 0 0 ${textColor[2] / 255}
		0 0 0 1 0
	`;
	imgSvgXml.getElementById("filterOutputColor").children[0].setAttribute("values", colorMatrix);
	
	// Serialize each image data as Base64 data:-URI and use it as override from now on
	let canvas = document.createElement("canvas");
	canvas.width = canvas.height = 16;
	canvas.getContext("2d").putImageData(img16x16Data, 0, 0);
	let imgSvgString = (new XMLSerializer()).serializeToString(imgSvgXml);
	browserActionIcon.overrideEnableIcon({
		path: {
			16:  canvas.toDataURL("image/png"),
			256: `data:image/svg+xml;base64,${btoa(imgSvgString)}`,
		}
	});
	return true;
}

if(typeof(browser.theme) !== "undefined") {
	browser.theme.onUpdated.addListener((updateInfo) => {
		processThemeInfo(updateInfo.theme).catch(console.error);
	});

	browser.theme.getCurrent().then((theme) => {
		processThemeInfo(theme).catch(console.error);
	});
}
