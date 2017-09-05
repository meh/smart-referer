/**
 * Translates a HTMl page in the web l10n style from the Add-on SDK with
 * WebExtensions strings.
 * Large parts of the logic are very similar to the SDK implmentation.
 * All you have to do to use this in a document is load it.
 *
 * @author Martin Giger
 * @license MPL-2.0
 */

function translateElementAttributes(element) {
    const attrList = [ 'title', 'accesskey', 'alt', 'label', 'placeholder' ];
    const ariaAttrMap = {
        'ariaLabel': 'aria-label',
        'ariaValueText': 'aria-valuetext',
        'ariaMozHint': 'aria-moz-hint'
    };
    const attrSeparator = '.';

    // Translate allowed attributes.
    for(let attribute of attrList) {
        const data = browser.i18n.getMessage(element.dataset.l10nId + attrSeparator + attribute);
        if(data && data != "??") {
            element.setAttribute(attribute, data);
        }
    }

    // Translate aria attributes.
    for(let attrAlias in ariaAttrMap) {
        const data = browser.i18n.getMessage(element.dataset.l10nId + attrSeparator + attrAlias);
        if(data && data != "??") {
            element.setAttribute(ariaAttrMap[attrAlias], data);
        }
    }
}

function translateElement(element = document) {

    // Get all children that are marked as being translateable.
    const children = element.querySelectorAll('*[data-l10n-id]');
    for(let child of children) {
        const data = browser.i18n.getMessage(child.dataset.l10nId);
        if(data && data != "??") {
            if(child.dataset.l10nAllowHtml === "true") {
                child.innerHTML = data;
            } else {
                child.textContent = data;
            }
        }
        translateElementAttributes(child);
    }
}

window.addEventListener("DOMContentLoaded", () => translateElement(), {
    capturing: false,
    passive: true
});
