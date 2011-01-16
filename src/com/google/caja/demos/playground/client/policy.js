// Playground policy
//  - exposes flash
//  - exposes alert
tamings___ = [];
/**
 * Simple flash taming
 *   - exposes a taming of the swfobject API
 *   - ensures version of flash > 9 (defaults to v10)
 *   - adds parameters to limit network and prevent script access
 */

tamings___.push(function tameSimpleFlash(___, imports) {
  if (!parent.___) {
    imports.outers.swfobject = {
      embedSWF: function() { console.log("Flash is not supported on ES3"); }
    };
    ___.grantRead(imports.outers, 'swfobject');
    ___.grantFunc(imports.outers.swfobject, 'embedSWF');

    return;
  }
  // Get a frame with no Caja in it.
  var ifr = document.createElement('iframe');
  document.body.appendChild(ifr);
  var O = ifr.contentWindow.Object;
  var A = ifr.contentWindow.Array;
  document.body.removeChild(ifr);
  
  ___.flash = {
    /**
     * Converts cajoled objects to objects with no special properties.
     * Enumerable guest properties must not be recursive.
     */
    untame: function untame(obj) {
        var result, i;
        var t = typeof obj;
        if (t === 'object') {
          if (Array.isArray(obj)) {
            result = new A();
          } else {
            result = new O();
          }
          var keys = ___.allEnumKeys(obj), len = keys.length;
          for (i = 0; i < len; ++i) {
            result[keys[i]] = untame(obj[keys[i]]);
          }
        } else {
          result = obj;
        }
        return result;
      },

    /**
     * Converts a valija object (since the host page is valija)
     * generated by flash (so everything's writable/enumerable/configurable)
     * into an ES5/3 object.
     */
    tame: function tame(obj) {
        var result, i;
        var t = typeof obj;
        if (t === 'object') {
          if (Array.isArray(obj)) {
            result = [];
          } else {
            result = {};
          }
          for (i in obj) {
            if (/__$/.test(i)) { continue; }
            var value = tame(obj[i]);
            if (typeof i === 'number' || ('' + (+i)) === i) {
              result[i] = value;
            } else {
              result.DefineOwnProperty___(i, {
                  value: value,
                  writable: true,
                  configurable: true,
                  enumerable:true
                });
            }
          }
        } else {
          result = obj;
        }
        return result;
      },

    cajaContextTable: []
  };

  // Modify the host page wunderbar
  parent.___.flash = {
      onLoaderInit: function(context) {
          // ___.log('onLoaderInit:' + context)
        },
      onLoaderError: function(context) {
          // ___.log('onLoaderError: ' + context);
        },
      onAddCallback: function(context, fnName) {
          // ___.log('onAddCallback: ' + context + ', ' + fnName);
          // Mark the function as callable.
          ___.flash.cajaContextTable[context][fnName+'_m___'] = 1;
        },
      onCall: function(context, fnName, args) {
          // _.log('onCall: ' + context + ', ' + fnName + ', ' + args);
          var fn = imports[fnName];
          if (___.isFunction(fn)) {
            var tameargs = ___.flash.tame(args);
            var result = fn.f___(___.USELESS, tameargs);
            result = ___.flash.untame(result);
            return result;
          }
          return void 0;
        },
      onNavigateToURL: function(context, url) {
          // ___.log('onNavigateToURL: ' + context + ', ' + url);
        }
    };

  imports.outers.swfobject = {};
  imports.outers.swfobject.embedSWF = function(swfUrl, id, width, height, 
      version, expressInstall, flashvars, params, attributes, cb) {
    var cajaContext = ___.flash.cajaContextTable.length;
    var tameSwfUrl = 'flashbridge.swf' +
        '?__CAJA_cajaContext=' + cajaContext +
        '&__CAJA_src=' + swfUrl;
    ___.flash.cajaContextTable[cajaContext] = {};
    var tameId = imports.outers.document.getElementById(id).node___.id;
    var tameWidth = +width;
    var tameHeight = +height;
    // Default to 10.0 if unspecified or specified < 9
    // else use whatever version >9 the user suggests
    var tameVersion = version || "10.0";
    if (!/^9|([1-9][0-9])\./.test(tameVersion)) {
      tameVersion = "10.0";
    }
    var tameExpressInstall = false;
    var tameAttr = null;
    var tameParams = {allowScriptAccess: 'always', allowNetworking: 'all'};

    var result = swfobject.embedSWF(
        tameSwfUrl,
        tameId,
        tameWidth,
        tameHeight,
        tameVersion,
        tameExpressInstall,
        flashvars,
        tameParams,
        tameAttr,
        ___.isFunction(cb) ? 
            function(e) {
              /**
               * Properties of this event object are:
               * success, Boolean to indicate whether the embedding of a SWF
               *    was success or not
               * id, String indicating the ID used in swfobject.registerObject
               * ref, HTML object element reference (returns undefined when
               *    success=false)
               **/
              var ref = ___.flash.cajaContextTable[cajaContext] = e.ref;
              e = {
                  success: e.success,
                  id: e.id, 
                  ref:{
                      // ref is an object on which you can only invoke
                      // methods.
                      m___: function (methodName, args) {
                          var feralargs = ___.flash.untame(args);
                          if (ref[methodName+'_m___']) {
                            return ___.flash.tame(
                                ref[methodName].apply(ref, feralargs));
                          }
                          return void 0;
                        }
                    }
                };
              ___.grantRead(e, 'success');
              ___.grantRead(e, 'id');
              ___.grantRead(e, 'ref');
              return cb.f___(___.USELESS, [e]);
            } : 
            null);
  };
  ___.grantRead(imports.outers, 'swfobject');
  ___.grantFunc(imports.outers.swfobject, 'embedSWF');
});

/**
 * Throttled alert taming
 *   - exposes a taming of the alert function
 *   - ensures that after 10 alerts the user has the option of redirecting
 *     remaining calls to alert to cajita.log instead
 */
tamings___.push(function tameAlert(___, imports) {
  imports.outers.alert = (function() {
    var remainingAlerts = 10;
    function tameAlert(msg) {
      if (remainingAlerts > 0) {
        remainingAlerts--;
        alert("Untrusted gadget says: " + msg);
      } else if (remainingAlerts == 0) {
        remainingAlerts = confirm("Ignore remaining alerts?") ? -1 : 10;
      }
    };
    return tameAlert;
  })();
  ___.grantFunc(imports.outers, 'alert');
});

/**
 * Expose a "record" function used by sunspider benchmarks
 */
tamings___.push(function tameRecord(___, imports) {
  imports.outers.recordResult = function recordResult(number) {
    if (!!console && !!console.log) {
      console.log("Time taken: " + number);
    }
  };
  ___.grantFunc(imports.outers, 'recordResult');
});
