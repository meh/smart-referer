/*
 *           DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
 *                   Version 2, December 2004
 *
 *  Copyleft meh.
 *
 *           DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
 *  TERMS AND CONDITIONS FOR COPYING, DISTRIBUTION AND MODIFICATION
 *
 *  0. You just DO WHAT THE FUCK YOU WANT TO.
 *********************************************************************/

const Observer = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
const IO       = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);

function RefSpoofer () {
  this.specials = /[-[\]{}()*+?.,\\^$|#\s]/g;
}

RefSpoofer.prototype = {
  observe: function (subject, topic, data) {
    this.log(topic)

    switch (topic) {
      case "http-on-modify-request":
        subject.QueryInterface(Components.interfaces.nsIHttpChannel);
        
        this.onModifyRequest(subject);
      break;

      case "profile-after-change":
      case "app-startup":
        this.log('wat');

        Observer.addObserver(
          this, "http-on-modify-request", true
        );
      break;
    }
  },

  onModifyRequest: function (http) {
    try {
      http.QueryInterface(Components.interfaces.nsIChannel);

      var referer;

      try {
        referer = http.getRequestHeader("Referer");
        referer = IO.newURI(referer, null, null); // make a nsIURI object for referer
      }
      catch (e) { }

      if (!referer) {
        return;
      }

      var requestURI = http.URI;      // request nsIURI object
      var destHost   = referer.host;  // referer host w/o scheme
      var srcHost    = http.URI.host; // request host without scheme

      // match is not what we want, unless we escape dots:
      var destHostMatch = destHost.replace(this.specials, "\\$&");
      var srcHostMatch  = srcHost.replace(this.specials, "\\$&");

      // FIXME: This isn't exactly bulletproof security here, but it still
      // may need to be more lenient not to break sites...
      //
      // If we suspect issues, we can try doing the following first:
      // 1. Strip off all TLD suffixes, up to but not including '.'
      // 2. If more than one domain part is till left, strip off prefix

      // if they're in the same domain (if we can tell) or have the same host, keep the referer
      // dest is a substring of src
      if (srcHost.split(".").length >= destHost.split(".").length && srcHost.match(destHostMatch)) {
        return;
      }
      else if (destHost.split(".").length >= srcHost.split(".").length && destHost.match(srcHostMatch)) {
        return;
      }

      // if they do not have the same host adjust the referer
      if (http.referrer) {
        referer = requestURI.scheme + "://" + requestURI.host;

        http.referrer.spec =  referer;
        http.setRequestHeader("Referer", referer, false);
      }
    }
    catch (e) { }
  },

  QueryInterface: function (id) {
    if (!id.equals(Components.interfaces.nsISupports) && !id.equals(Components.interfaces.nsIObserver) &&       !id.equals(Components.interfaces.nsISupportsWeakReference)) {
      throw Components.results.NS_ERROR_NO_INTERFACE;    
    }

    return this;
  },

  _xpcom_categories: [{ category: "profile-after-change" }, { category: "app-startup", service: true }],
  classID: Components.ID("smart-referer@meh.paranoid.pk"),
  contractID: "@mozilla.org/smart-referer;1",
  classDescription: "Smart Referer Spoofer"
};

/**
* XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
* XPCOMUtils.generateNSGetModule is for Mozilla 1.9.2 (Firefox 3.6).
*/
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

if (XPCOMUtils.generateNSGetFactory) {
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([RefSpoofer]);
}
else {
    var NSGetModule = XPCOMUtils.generateNSGetModule([RefSpoofer]);
}
