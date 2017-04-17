Smart Referer
=============
This extension automatically hides the referer when changing domains.

The domain changing is based on the same origin policy.

Options
-------
* *Strict mode*: When enabled, *Smart Referer* will treat different subdomains
  as being different websites. Therefor `a.example.com` and `b.example.com`
  will not be able to see each others referer. In general this often causes
  issues and results in little to no privacy improvement, we therefor highly
  recommended to leave this disabled.

* *Exceptions*: A list of different source and destination hosts that should
  never have their referer changed. For instance a rule with Source `*` and
  Destination `*.example.com` will pass referers of all website to any resource
  served at `example.com` (including its subdomains).

* *Whitelist Source*: An URL to a document that contains addional whitelist
  rules. The [default whitelist](http://meh.schizofreni.co/smart-referer/whitelist.txt)
  tries to minimize the impact of this extension on everyday web surfing while
  still providing the maximum referer privacy possible under these
  circumstances. [This may not be what you want](https://github.com/meh/smart-referer/issues/50).
  
  Misbehaviour in the face of spoofed referer is also not that common anymore,
  so most users should not experience any issues by disabling this feature
  entirely. (Which may be done simply by leaving the field empty.)
  
* *Referer mode*: Can be used to change what is sent to the server instead of
  the original referer header. The default (*Send the URL you're going to as
  referer*) is known to cause the least issues on most sites and is therefor
  recommended.

A website is not working, what should I do?
--------------------------------
If a website is not working properly the first thing you can try is making sure
strict mode is disabled.

If the issue isn't solved, you can try adding an exeception for the domain by
adding the source `*.<domain.name>` and the destination `*`. Allowing
`www.example.com` to access everything with the orignal referer you would
therefor add `*.example.com` as the source and `*` as the destination.

**Please** also open an issue about it (even if you cannot find a solution)
and we'll try to add the proper patterns to the autoupdated whitelist.
