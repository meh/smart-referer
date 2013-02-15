Smart Referer
=============
This addon automatically removes the referer when changing domains.

The domain changing is based on the same origin policy.

Options
-------
* `extensions.smart-referer.strict` tells smart referer how to treat
  subdomains, when enabled it treats them as different websites. `false` by
  default.

* `extensions.smart-referer.whitelist.to` is a `;`, `,` or space separated list of
  regular expressions that are matched against the URL you're going to, if one
  of them matches, the referer is sent intact.

* `extensions.smart-referer.whitelist.from` is a `;`, `,` or space separated list of
  regular expressions that are matched against the URL you're coming from, if
  one of them matches, the referer is sent intact.

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

If the issue isn't solved, like for Disqus, what you can do is whitelist the
domain by setting `extensions.smart-referer.whitelist.to` with a regular
expression, for Disqus it would be `disqus\.com$`.

Toggling smart-referer with [Custom Buttons](https://addons.mozilla.org/en-US/firefox/addon/custom-buttons/?src=search)
------------------------------------------------------------------------------------------------------------------------

```javascript
Components.utils.import('resource://gre/modules/AddonManager.jsm');

AddonManager.getAddonByID('smart-referer@meh.paranoid.pk', function (addon) {
    addon.userDisabled = !addon.userDisabled;
});
```
