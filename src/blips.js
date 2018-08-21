

;(function(){

////////////////////////////////////////////////////////////////////////////////

  //Constructor
  var Blip = function(val){
    if(!(this instanceof Blip)) return new Blip(val);
    this.value = val;
    this.fans = [];
    this.destructors = [];
  };

////////////////////////////////////////////////////////////////////////////////

  //Static Methods
  
  var undefined = (function(x){ return x; })();

  var handlerCache = {};
  var registerDomListener = function(eName,filter,handler){
    var filtering = function(e){
      var target = e.target;
      var isMatch = target.matches(filter);
      if(isMatch) handler.apply(this,arguments);
    };
    var cacheKey = eName + ' ' + filter;
    handlerCache[cacheKey] = handlerCache[cacheKey] || filtering;

    document.addEventListener(eName,filtering,false);
  };

  var deregisterDomListener = function(eName,filter){
    var cacheKey = eName + ' ' + filter;
    var handler = handlerCache[cacheKey]; 
    document.removeEventListener(eName,handler);
  };

  var event = function(eName,filter){
    filter = filter || '*';
    var b = Blip();
    registerDomListener(eName,filter,function(e){
      b.set(e);
    });
    b.end(function(){
      deregisterDomListener(eName,filter);
    });
    return b;
  };

  var eventShortcut = function(eventName){
    return function(filter){
      return Blip.event(eventName,filter);
    };
  };

  var click = eventShortcut('click');
  var mouseover = eventShortcut('mouseover');

  var target = function(eventName,filter){
    return this
      .event(eventName,filter)
      .map(function(e){
        return e.target;
      });
  }

  var blipWatcherCache = [];
  var poll = function(ref,key,interval){
    //For things which can only be 'watched'
    interval = interval || 100;

    var found = undefined;
    for(var i in blipWatcherCache){
      var obj = blipWatcherCache[i];
      if(obj.ref === ref && obj.key === key){
        found = obj;
      }
    }
    if(found){
      return found.blip;
    } else {
      var b = Blip(ref[key]);
      var cancelToken = window.setInterval(function(){
        var currentVal = ref[key];
        var oldVal = b.value;
        if(currentVal !== oldVal){
          b.set(currentVal);
        }
      },interval);
      b.end(function(){
        window.clearInterval(cancelToken);
      });
      blipWatcherCache.push({
        ref:ref,
        key:key,
        blip:b,
        cancelToken:cancelToken
      });
      return b;
    }
    
  };
  var interval = function(ms){
    ms = ms || 100;
    var b = Blip();
    window.setInterval(function(){
      b.set();
    },ms);
    return b;
  };

////////////////////////////////////////////////////////////////
  
  //Prototype Methods
  
  var end = function(destructor){
    //propagate an 'end' to all composed blips to presumably 
    //one day cause a destructive cascade to save memory
    var enders = this.destructors;
    if(arguments.length === 0){
      for(var i in enders){
        if(enders.hasOwnProperty(i)){
          enders[i].apply(undefined,[this.value]);
        }
      }
    } else {
      this.destructors.push(destructor);
    }
  };
  var set = function(v){
    this.value = v;
    var fs = this.fans;
    for(var i in fs){
      if(fs.hasOwnProperty(i)){
        var observerFn = fs[i];
        observerFn.apply(undefined,[v]);
      }
    }
    return this;
  };
  var calls = function(observerFn){
    this.fans.push(observerFn);
    return this;
  };
  var sets = function(other){
    this.calls(function(v){
      other.set(v);
    });
    return this;
  }
  var map = function(mapFn){
    var b = Blip();
    this.calls(function(v){
      var mapped = mapFn(v);
      b.set(mapped);
    });
    return b;
  }
  var predicate = function(predMech){
    if(typeof predMech === 'undefined'){
      return function(v){ return v; };
    } else if (typeof predMech === 'string'){
      return function(v){ return v === predMech; };
    } else if (typeof predMech === 'boolean'){
      return function(v){ return predMech; };
    } else if (typeof predMech === 'function'){
      return predMech;
    }
  }
  var filter = function(filterMech){
    var b = Blip();
    var filterer = predicate(filterMech);
    this.calls(function(v){
      var ok = filterer(v);
      if(ok) b.set(v);
    });
    return b;
  }
  var omit = function(omitMech){
    var b = Blip();
    var omitter = predicate(omitMech);
    this.calls(function(v){
      var bad = omitter(v);
      if(!bad) b.set(v);
    });
    return b;
  }
  var flatmapLatest = function(fn){
    var b = Blip();
    this.calls(function(v){
      var anotherBlip = fn(v);
      anotherBlip.sets(b);
    });
    return b;
  };
  var until = function(blip){
    var happened = false;
    blip.calls(function(v){
      if(!happened){
        happened = true;
      }
    });
    return this.filter(function(v){
      return !happened;
    });
  }
  var gets = function(other){
    var b = Blip();
    this.calls(function(v){
      var otherVal = other.value;
      b.set(otherVal);
    });
    return b;
  }
  var andPrevious = function(){
    var b = Blip();
    var oldVal = this.value;
    this.calls(function(v){
      var pair = [oldVal,v];
      oldVal = v;
      b.set(pair);
    });
    return b;
  }
  var ifis = function(other,otherValue){
    return this.filter(function(v){
      return other.value === otherValue;
    });
  }
  var once = function(fn){
    var called = false;
    var b = Blip();
    this.calls(function(v){
      if(!called){
        called = true;
        b.set(v);
      }
    });
    return b;
  }
  var toPromise = function(){
    var returnPromise = p();
    this.calls(function(v){
      returnPromise.resolve(v);
      //var actualPromise = fn(v);
      //actualPromise.then(function(a){
      //  returnPromise.resolve(a);
      //});
    });
    return returnPromise;
  }
  var fromPromise = function(fn){
    var returnBlip = Blip();
    this.calls(function(v){
      var actualPromise = fn(v);
      actualPromise.then(function(a){
        returnBlip.set(a);
      });
    });
    return returnBlip;
  }
  var dot = function(strPropName){
    return this.map(function(x){
      return x[strPropName];
    });
  }

////////////////////////////////////////////////////////////////////////////////

  Blip.event = event;
  Blip.target = target;
  Blip.click = click;
  Blip.mouseover = mouseover;
  Blip.poll = poll;
  Blip.interval = interval;

  Blip.prototype = {
    end: end,
    set: set,
    calls: calls,
    sets: sets,
    map: map,
    until: until,
    flatmapLatest: flatmapLatest,
    gets: gets,
    andPrevious: andPrevious,
    ifis: ifis,
    once: once,
    omit: omit,
    toPromise: toPromise,
    fromPromise: fromPromise,
    dot: dot,
    filter: filter
  };

  pc('blips',p(Blip));

})();

