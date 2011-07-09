/*
 *           DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
 *                   Version 2, December 2004
 *
 *  Copyleft meh. [http://meh.paranoid.pk | meh@paranoici.org]
 *
 *           DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
 *  TERMS AND CONDITIONS FOR COPYING, DISTRIBUTION AND MODIFICATION
 *
 *  0. You just DO WHAT THE FUCK YOU WANT TO.
 *********************************************************************/


function SmartRefererSpoofer () { }

SmartRefererSpoofer.prototype = (function () {
  var Observer              = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
  var NetworkIO             = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
  var ScriptSecurityManager = Components.classes["@mozilla.org/scriptsecuritymanager;1"].getService(Components.interfaces.nsIScriptSecurityManager);
  var EffectiveTLDService   = Components.classes["@mozilla.org/network/effective-tld-service;1"].getService(Components.interfaces.nsIEffectiveTLDService);

  var Interfaces = {
    Channel:               Components.interfaces.nsIChannel,
    HTTPChannel:           Components.interfaces.nsIHttpChannel,
    Supports:              Components.interfaces.nsISupports,
    Observer:              Components.interfaces.nsIObserver,
    SupportsWeakReference: Components.interfaces.nsISupportsWeakReference
  };

  function log (what) {
    what = what.toString();

    dump(what);
    dump("\n");
  }

  function modify (http) {
    try {
      http.QueryInterface(Interfaces.Channel);

      var referer = NetworkIO.newURI(http.getRequestHeader("Referer"), null, null);
    }
    catch (e) {
      return false;
    }

    try {
      var [fromURI, toURI] = [http.URI.clone(), referer.clone()];

      try {
        var isIP = false;

        EffectiveTLDService.getPublicSuffix(fromURI);
        EffectiveTLDService.getPublicSuffix(toURI);
      }
      catch (e) {
        if (e == NS_ERROR_HOST_IS_IP_ADDRESS) {
          isIP = true;
        }
      }

      if (!isIP) {
        let [from, to] = [fromURI, toURI].map(function (x) x.host.split('.').reverse());
        let index      = 0;

        while (from[index] || to[index]) {
          if (from[index] == to[index]) {
            index++;
          }
          else {
            from.splice(index);
            to.splice(index);
          }
        }

        if (from.length == 0) {
          throw Components.results.NS_ERROR_DOM_BAD_URI;
        }

        fromURI.host = from.reverse().join('.');
        toURI.host   = to.reverse().join('.');

        try {
          if (EffectiveTLDService.getPublicSuffix(fromURI) == fromURI.host) {
            throw Components.results.NS_ERROR_DOM_BAD_URI;
          }
        }
        catch (e) {
          if (e == Components.results.NS_ERROR_DOM_BAD_URI) {
            throw e;
          }
        }
      }

      ScriptSecurityManager.checkSameOriginURI(fromURI, toURI, false);

      return false;
    }
    catch (e) {
      http.referrer = null;
      http.setRequestHeader("Referer", null, false);

      return true;
    }
  }

  function observe (subject, topic, data) {
    switch (topic) {
      case "http-on-modify-request":
        modify(subject.QueryInterface(Interfaces.HTTPChannel));
      break;

      case "profile-after-change":
        Observer.addObserver(this, "http-on-modify-request", false);
      break;
    }
  }

  return {
    observe: observe,

    QueryInterface: function (id) {
      if (!id.equals(Interfaces.Supports) && !id.equals(Interfaces.Observer) && !id.equals(Interfaces.SupportsWeakReference)) {
        throw Components.results.NS_ERROR_NO_INTERFACE;    
      }

      return this;
    },

    classID: Components.ID("55fbf7cd-18ab-4f94-a9ff-4cf21192bcd8"),
    contractID: "smart-referer@meh.paranoid.pk/do;1",
    classDescription: "Smart Referer Spoofer",

    _xpcom_categories: [{ category: "profile-after-change" }]
  };
})();

/**
* XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
* XPCOMUtils.generateNSGetModule is for Mozilla 1.9.2 (Firefox 3.6).
*/
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

if (XPCOMUtils.generateNSGetFactory) {
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([SmartRefererSpoofer]);
}
else {
    var NSGetModule = XPCOMUtils.generateNSGetModule([SmartRefererSpoofer]);
}
