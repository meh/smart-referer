Smart Referer
=============
This addon automatically removes the referer when changing domains.

The domain changing is based on the same origin policy.

If `extensions.smart-referer.strict` is set to false subdomains are treated as same domain.

Toggling smart-referer with [Custom Buttons](https://addons.mozilla.org/en-US/firefox/addon/custom-buttons/?src=search)
------------------------------------------------------------------------------------------------------------------------

```javascript
Components.utils.import('resource://gre/modules/AddonManager.jsm');

AddonManager.getAddonByID('smart-referer@meh.paranoid.pk', function (addon) {
    addon.userDisabled = !addon.userDisabled;
});
```
