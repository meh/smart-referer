Smart Referer
=============
This addon automatically removes the referer when changing domains.

The domain changing is based on the same origin policy.

Options
-------
* `extensions.smart-referer.strict` tells smart referer how to treat
  subdomains, when enabled it treats them as different websites. `false` by
  default.

* `extensions.smart-referer.allow` is a space separated list of wildcarded
  domains with an optional *from* constraint, it takes the following syntax:
  `from>to`, if there's no explicit from it implicitly becomes `*>to`.

* `extensions.smart-referer.mode` can be either `direct`, `self` or `user`.
  `self` by default.
  
  `direct` removes the referer completely thus making the server think you're
  directly going to the URL.

  `self` replaces the referer with the page you're going to thus making the
  server think you're either refreshing or going to the page from a link on the
  same page.

  `user` replaces the referer with a user given one that can be set in
  `extensions.smart-refer.referer`.

A website is not working, wat do
--------------------------------
If a website is not working properly the first thing you can try is making sure
strict mode is disabled.

If the issue isn't solved, like for Disqus, what you can do is allow the
domain by setting `extensions.smart-referer.allow` with a wildcard expression,
for Disqus it would be `*.disqus.com disquis.com`.

Toggling smart-referer with [Custom Buttons](https://addons.mozilla.org/en-US/firefox/addon/custom-buttons/?src=search)
------------------------------------------------------------------------------------------------------------------------

```javascript
Components.utils.import('resource://gre/modules/AddonManager.jsm');

AddonManager.getAddonByID('smart-referer@meh.paranoid.pk', function (addon) {
    addon.userDisabled = !addon.userDisabled;
});
```
