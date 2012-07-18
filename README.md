Smart Referer
=============
This addon automatically removes the referer when changing domains.

The domain changing is based on the same origin policy.

If `extensions.smart-referer.strict` is set to false subdomains are treated as same domain.

A website is not working, wat do
--------------------------------
If a website is not working properly the first thing you can try is disabling strict mode, most
of the time that will solve the issue.

If the issue isn't solved, like for Disqus, what you can do is whitelist the domain it's going to
by setting `extensions.smart-referer.whitelist.to` with a regular expression, for Disqus it would be
`disqus\.com$`.

You can also whitelist when the referer is coming from a certain domain by setting
`extensions.smart-referer.whitelist.from`.

Both contain a list of regular expressions without the `//` delimiters and separated by `[;,\s]+`.

Toggling smart-referer with [Custom Buttons](https://addons.mozilla.org/en-US/firefox/addon/custom-buttons/?src=search)
------------------------------------------------------------------------------------------------------------------------

```javascript
Components.utils.import('resource://gre/modules/AddonManager.jsm');

AddonManager.getAddonByID('smart-referer@meh.paranoid.pk', function (addon) {
    addon.userDisabled = !addon.userDisabled;
});
```
