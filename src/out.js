

var root;
;(function(){

  //This could be global or window
  root = this;

  //SO tired of typing this out, this shouldn't be here, but I don't care
  root.l = console.log.bind(console);

})();

////////////////////////////////////////////////////////////////////////////////

//PROMISES
;(function(){

  //A bare bones promise implementation without stupid opinions

  //This is all I need for promises to work and work well

  //Was going to call it Promise, but that's taken by a shitty global/native
  //implementation, complete with callback-only constructors, bullshit exception
  //machinery, unnecessary cancellation machinery, and even more unnecessary
  //combinators, thanks google, I really hope I never inherit a codebase which
  //uses that over-engineered nonsense in over-engineered ways. But let's face
  //it...that is exactly what will happen to me... because... you know...
  //we all need to be like Google and Facebook


  //Constructor of the FUTURE

  var Future = function(v){
    if(this instanceof Future){
      this.observers = [];
      this.value     = v;
      this.resolved  = v ? true : false;
    } else {
      return new Future(v);
    }
  };


  //Static Methods ... uh oh ... there's only two ...

  var isPromise = function(p){
    return ( typeof(p           ) === 'object'  )
      &&   ( typeof(p.then      ) === 'function')
      &&   ( typeof(p.resolved  ) === 'boolean' )
      &&   ( typeof(p.observers ) === 'object'  )
      ;
  };

  var all = function(promises){
    //Recursively bind the promises passed in to one another
    //So when all resolve, then the encompasing promise does too
    //This happens regardless of resolution order
    var head = promises.pop();
    return promises.length
      ? all(promises).then(function(results){
        return head.then(function(result){
          results.push(result);
          return results;
        });
      })
      : head.then(function(x){ return [x]; })
      ;
  };


  //Prototype Methods

  var resolve = function(v){
    //Fulfills a promise, sets the value to v,notifies the observers
    if(!this.resolved){
      this.value = v;
      this.resolved = true;
      for(var k in this.observers){
        var fn = this.observers[k];
        fn(v);
      }
    }
    return this;
  };

  var thenImmediateWithValue = function(fn,value){
    //To be called when p1's value is available
    var callBackResult = fn(value);
    //If cb result not promise make promise to make types consistent
    var cbPromise = Future.isPromise(callBackResult)
      ? callBackResult
      : Future(callBackResult)
      ;
    //Never trust cb context
    var me = this;
    cbPromise.then(function(v){
      me.resolve(v);
    });
  };
  var then = function(fn){
    //The 'bind' implementation, sequences a promise with another.
    //The callback from p1 executes after p1 resolves,
    //it is called with p1's value and returns p2
    //a third promise is returned which resolves once p2 has resolved.
    //p3 resolves with p2's value
    var nu = Future();
    if (this.resolved) {
      nu.thenImmediateWithValue(fn,this.value);
    } else {
      this.observers.push(function(value){
        nu.thenImmediateWithValue(fn,value);
      });
    }
    return nu;
  };


  //Connections

  Future.isPromise = isPromise;
  Future.all       = all;
  Future.prototype = {
    resolve: resolve,
    then:    then,
    //I don't know if I like this being a prototype method
    thenImmediateWithValue: thenImmediateWithValue
  };

  //Export to 'root' since google and node could never get their shit straight about Window vs Global
  root.p = Future;
  root.Future = Future;

})();

////////////////////////////////////////////////////////////////////////////////

//PROMISE CACHE / MODULE SYSTEM
;(function(){

  //The promise cache is just an object (key-value pairs)
  //where the keys are arbitrary module names easy to refer
  //to by the developer

  var pcache = {};
  var pc = function(promiseName,definition){
    var current = pcache[promiseName];
    if(arguments.length === 1){
      //requesting a promise:  pc('mySpoonModule')
      if(!current){
        //dummy promise, basically wait to be defined later
        pcache[promiseName] = p();
      }
    } else {
      //defining a promise:  pc('myModule',somePromise)
      if(!current){
        //if first time defining promise at given key
        pcache[promiseName] = definition;
      } else if(current && !current.resolved){
        //if overwriting promise at key,
        //or resolving dummy promise (as for module loading)
        var sideEffecting = definition
          .then(function(result){
            current.resolve(result);
            return p(result);
          });
        pcache[promiseName] = sideEffecting;
      } else {
        /* do nothing, promise exists, */
        /* so just return it           */
      }
    }
    return pcache[promiseName];
  };

  pc.all = function(){
    //requesting multiple: pc('a','b','c')
    var promises = [];
    for(var i in arguments){
      var moduleName = arguments[i];
      var modulePromise = pc(moduleName);
      promises.push(modulePromise);
    }
    return p.all(promises);
  };

  //export
  root.pc = pc;

})();


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
  var toPromise = function(fn){
    var returnPromise = p();
    this.calls(function(v){
      var actualPromise = fn(v);
      actualPromise.then(function(a){
        returnPromise.resolve(a);
      });
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




         pc('parsers')         .then(function(p){
  return pc('blips')           .then(function(b){
    l('resolved parsers');
    l('resolved blips');
  }); });


;(function(){
  p.fromNodeModule = function(moduleName){
    //From imperative to functional; just beautiful!
    var nodeModule = require(moduleName);
    return p(nodeModule);
  };
  pc.fromNodeModule = function(moduleName){
    //From imperative to functional; just beautiful!
    var nodeModulePromise = p.fromNodeModule(moduleName);
    pc(moduleName,nodeModulePromise);
    return pc(moduleName);
  };
  //Borrowing verbiage from 'q' library
  root.deNodeify = function(fn){
    var result = function(){
      var a = Array.prototype.slice.call(arguments);
      var e = a.shift();
      if(e) l('Error: ',e);
      return fn.apply(this,a);
    };
    return result;
  }
})();


//;(function(){
//  //var SerialPort = require('serialport');
//         pc.fromNodeModule('serialport').then(function(SerialPort){
//  return pc('blips')                    .then(function(b){
//    var d = root.deNodeify;
//    //Detecting open errors can be moved to the constructor's callback.
//    var port = '/dev/ttyUSB0';
//    var baud = 9600;
//    var port = new SerialPort(port,{baudRate:baud,autoOpen:false});
////    var eventToBlip = function(port,eventName){
////      var result = new b();
////      port.on(eventName, function(val) {
////        l('on '+eventName+': ', arguments );
////        result.set(val);
////      });
////      return result;
////    };
//    var o = port.open(d(function () {
//      l('Port created: ', arguments);
////      var err = eventToBlip(port,'error');
////      err.calls(function(val){ l('errBlip: ',arguments); });
////      var op = eventToBlip(port,'open');
////      op.calls(function(val){ l('openBlip: ',arguments); });
//      var parser = new SerialPort.parsers.Readline();
//      port.pipe(parser);
////      var dat = eventToBlip(parser,'data');
////      dat.calls(function(val){ l('dataBlip: ',arguments); });
//      parser.on('data', function (data) {
//        l('Data:', arguments);
//        if(data.includes('!')){
//          port.close(d(function() {
//            l('port closed: ',arguments);
//          }));
//        }
//      });
//      port.write('hi ', d(function() {
//        l('message written',arguments);
//      }));
//    port.on('error', function() { l('on Error: ', arguments ); })
//    port.on('open', function() { l('Open:', arguments); });
//    }));
//  }); });
//})();


;(function(){
  //Client module
  var pcfs = pc.fromNodeModule('fs');
         pcfs        .then(function(fs){
  return pc('blips') .then(function(b){
    var ttyUsb = '/dev/ttyUSB0';
    var fsIn = fs.createReadStream(ttyUsb);
    fsIn.on('open',function(){
      l('input ready: ',arguments);
      b.fileData = function(fsIn){
        var fd = new b();
        fsIn
          .on('data',function(err,data){
            fd.set(err || data);
          });
        return fd;
      };
      var tty = b.fileData(fsIn);
      var str = tty
        .map(function(dat){
          var str = dat.toString();
          return str;
        });
      str
        .calls(function(dat){
          l('str: ',dat);
          var pass = dat.includes('Hello World!');
          l('pass: ',pass);
        });
    });

    var fsOut = fs.createWriteStream(ttyUsb);
    fsOut.on('open',function(){
      l('output ready: ',arguments);
      b.fileWrite = function(fsOut){
        var fd = new b();
        fd.calls(function(d){
          fsOut.write(d);
        });
        return fd;
      };
      var out = b.fileWrite(fsOut);
      out.set('hi ');
    });

    //process.stdin.addEventListener('data',function(){
    //var stdin = process.openStdin();
    //stdin.addListener('data',function(){
    process.stdin.on('data',function(){
      l('stdin data: ',arguments);
    });
    //l('stdin pipe: ', process.stdin.pipe);
    process.stdin.pipe(fsOut);
    //process.stdin.resume();
    //out.set('s');
    //out.set('p');
    //out.set(' ');
    //out.set('h');
    //out.set('i');
    //out.set(' ');
    //out.set('o');
    //out.set('n');
    //out.set('e');
    //out.set(' ');
    //out.set('d');
    //out.set('s');
    //out.set('p');
    //out.set(' ');
  }); });
})();






;(function(){

  var Parser = function(parsingFn){
    //Constructor: allow the optional use of the 'new' keyword
    if(!(this instanceof Parser)) return new Parser(parsingFn);
    this.position    = 0;
    this.parse       = parsingFn;
    this.parseFailed = false;
  };

  Parser.prototype.as = (function(){
    //This is the bind function implementation
    //This is where the magic begins
    //I've renamed the implementation as 'as' 
    //since we are making parsers.
    //This will make the API a bit more fluent 
    //since people will be able to write code like this:
    //  dateParser.as((date)=>{});
    //
    var updateWith = function(parser){
      //If I recall correctly I couldn't do trampolining for some reason,
      //and functional state threading would have required too many parameters
      //so I stuffed all the state threading into a helper function like this
      this.position    = parser.position;
      this.input       = parser.input;
      this.parseFailed = parser.parseFailed;
      this.position    = parser.position;
      this.parseError  = parser.parseError;
      return this; 
    }
    var dispatchUsing = function(parser){
      //In this fn this and parser are swapped with respect to their usual meanings
      this.updateWith(parser);
      var returnValue = this.parse();
      parser.updateWith(this);
      return returnValue;
    }
    var defaultError = function(){
      //just in case the parser implementor was lazy and didn't do this themselves
      var current     = this.position;
      var begin       = current - 20;
      var end         = current + 20;
      var input       = this.input;
      var errorPrefix = input.substring(begin,current);
      var errorSuffix = input.substring(current,end);
      return "FAIL @: " + errorPrefix + '|' + errorSuffix;
    }
    return function(callback){
      var previous = this;
      return Parser(function(){
        //Don't pass input or any other state into callbacks,
        //maintain singluar (or as close thereto) references.

        //assign state as if in callback from previous parser 
        var parsedValue = previous.dispatchUsing(this);

        if(this.parseFailed){
          if(!this.parseError) this.parseError = this.defaultError();
          return this.parseError;
        } else {
          //get the next parser
          var nextParser = callback(parsedValue);

          //setup & execute the next parser
          var nextParsed = nextParser.dispatchUsing(this);

          //update the parser being returned(3) which is 
          //composing the previous(1) and the next(2) parsers 
          return nextParsed;
        }
      });
    }
  })();
  Parser.result = function(val){
    //This is the 'return' implementation, 
    //the other half of the bind+return monad interface
    return Parser(function(){
      return val;
    });
  }
  Parser.prototype.run = function(input){
    this.position = 0;
    this.input    = input;
    var parsed    = this.parse();
    return parsed;
  }
  
////////////////////////////////////////////////////////////////////////////////

  Parser.stringp = function(search){
    //Search for a specific string 'search'
    return Parser(function(){
      var input    = this.input;
      var begin    = this.position;
      var end      = begin + search.length;
      var possible = input.substring(begin,end);
      var match = search === possible;
      if(match){
        //Advance the cursor and return the matched value
        this.position += search.length;
        return search;
      } else {
        this.parseFailed = true;
      }
    });
  };

  //Parser.prototype.sp = function(){
  //  //'sp' means 'space character'
  //  return this.left(Parser.stringp(' '));
  //};
  Parser.prototype.or = function(parser){
    var previous = this;
    return Parser(function(){
      var fallbackPosition = this.position;
      var firstTry = previous.dispatchUsing(this);
      if(this.parseFailed) {
        this.position = fallbackPosition;
        this.parseFailed = false;
        var secondTry = parser.dispatchUsing(this);
        return secondTry;
      } else {
        return firstTry;
      }
    });
  };
  Parser.many = function(parser){
    return Parser(function(){
      var result = [];
      var fallbackPosition = this.position;
      while(!this.parseFailed){
        var val = parser.dispatchUsing(this);
        if(this.parseFailed){
          this.position = fallbackPosition;
        } else {
          result.push(val);
          fallbackPosition = this.position;
        }
      }
      this.parseFailed = false;
      return result;
    });  
  };
  Parser.optional = function(str){
    var s   = Parser.stringp;
    return s(str).or(s(''));
  };
  Parser.prototype.left = function(nextParser){
    //'left' means 'ignore-right', and 'right' means 'ignore-left' 
    //so  in parseA.left(parseB), we only get 'A'
    //and in parseA.right(parseB), we only get 'B'
    return this      .as(function(l){
    return nextParser.as(function(r){
    return Parser.result(l);
    });}); 
  };
  Parser.prototype.right = function(nextParser){
    //'left' means 'ignore-right', and 'right' means 'ignore-left' 
    //so  in parseA.left(parseB), we only get 'A'
    //and in parseA.right(parseB), we only get 'B'
    return this      .as(function(l){
    return nextParser.as(function(r){
    return Parser.result(r);
    });}); 
  };
  Parser.prototype.y = function(nextParser){
    //'y' is spanish for 'and'
    return this      .as(function(t){
    return nextParser.as(function(n){
    return Parser.result(t + n);
    });}); 
  };

  pc('parsers',p(Parser));

})();




var root;
;(function(){

  //This could be global or window
  root = this;

  //SO tired of typing this out, this shouldn't be here, but I don't care
  root.l = console.log.bind(console);

})();

////////////////////////////////////////////////////////////////////////////////

//PROMISES
;(function(){

  //A bare bones promise implementation without stupid opinions

  //This is all I need for promises to work and work well

  //Was going to call it Promise, but that's taken by a shitty global/native
  //implementation, complete with callback-only constructors, bullshit exception
  //machinery, unnecessary cancellation machinery, and even more unnecessary
  //combinators, thanks google, I really hope I never inherit a codebase which
  //uses that over-engineered nonsense in over-engineered ways. But let's face
  //it...that is exactly what will happen to me... because... you know...
  //we all need to be like Google and Facebook


  //Constructor of the FUTURE

  var Future = function(v){
    if(this instanceof Future){
      this.observers = [];
      this.value     = v;
      this.resolved  = v ? true : false;
    } else {
      return new Future(v);
    }
  };


  //Static Methods ... uh oh ... there's only two ...

  var isPromise = function(p){
    return ( typeof(p           ) === 'object'  )
      &&   ( typeof(p.then      ) === 'function')
      &&   ( typeof(p.resolved  ) === 'boolean' )
      &&   ( typeof(p.observers ) === 'object'  )
      ;
  };

  var all = function(promises){
    //Recursively bind the promises passed in to one another
    //So when all resolve, then the encompasing promise does too
    //This happens regardless of resolution order
    var head = promises.pop();
    return promises.length
      ? all(promises).then(function(results){
        return head.then(function(result){
          results.push(result);
          return results;
        });
      })
      : head.then(function(x){ return [x]; })
      ;
  };


  //Prototype Methods

  var resolve = function(v){
    //Fulfills a promise, sets the value to v,notifies the observers
    if(!this.resolved){
      this.value = v;
      this.resolved = true;
      for(var k in this.observers){
        var fn = this.observers[k];
        fn(v);
      }
    }
    return this;
  };

  var thenImmediateWithValue = function(fn,value){
    //To be called when p1's value is available
    var callBackResult = fn(value);
    //If cb result not promise make promise to make types consistent
    var cbPromise = Future.isPromise(callBackResult)
      ? callBackResult
      : Future(callBackResult)
      ;
    //Never trust cb context
    var me = this;
    cbPromise.then(function(v){
      me.resolve(v);
    });
  };
  var then = function(fn){
    //The 'bind' implementation, sequences a promise with another.
    //The callback from p1 executes after p1 resolves,
    //it is called with p1's value and returns p2
    //a third promise is returned which resolves once p2 has resolved.
    //p3 resolves with p2's value
    var nu = Future();
    if (this.resolved) {
      nu.thenImmediateWithValue(fn,this.value);
    } else {
      this.observers.push(function(value){
        nu.thenImmediateWithValue(fn,value);
      });
    }
    return nu;
  };


  //Connections

  Future.isPromise = isPromise;
  Future.all       = all;
  Future.prototype = {
    resolve: resolve,
    then:    then,
    //I don't know if I like this being a prototype method
    thenImmediateWithValue: thenImmediateWithValue
  };

  //Export to 'root' since google and node could never get their shit straight about Window vs Global
  root.p = Future;
  root.Future = Future;

})();

////////////////////////////////////////////////////////////////////////////////

//PROMISE CACHE / MODULE SYSTEM
;(function(){

  //The promise cache is just an object (key-value pairs)
  //where the keys are arbitrary module names easy to refer
  //to by the developer

  var pcache = {};
  var pc = function(promiseName,definition){
    var current = pcache[promiseName];
    if(arguments.length === 1){
      //requesting a promise:  pc('mySpoonModule')
      if(!current){
        //dummy promise, basically wait to be defined later
        pcache[promiseName] = p();
      }
    } else {
      //defining a promise:  pc('myModule',somePromise)
      if(!current){
        //if first time defining promise at given key
        pcache[promiseName] = definition;
      } else if(current && !current.resolved){
        //if overwriting promise at key,
        //or resolving dummy promise (as for module loading)
        var sideEffecting = definition
          .then(function(result){
            current.resolve(result);
            return p(result);
          });
        pcache[promiseName] = sideEffecting;
      } else {
        /* do nothing, promise exists, */
        /* so just return it           */
      }
    }
    return pcache[promiseName];
  };

  pc.all = function(){
    //requesting multiple: pc('a','b','c')
    var promises = [];
    for(var i in arguments){
      var moduleName = arguments[i];
      var modulePromise = pc(moduleName);
      promises.push(modulePromise);
    }
    return p.all(promises);
  };

  //export
  root.pc = pc;

})();


;(function(){

  var templ = (function(){
    //modified heavily from npm resig

    var makeFn = function(str){
      // Generate a reusable function that will serve as a template
      // generator (and which will be cached).
      var openInterpolation  = "\|\~";
      var evaluationFlag     = ":";
      var closeInterpolation = "\~\|";

      var functionDefinition = 
        "var p=[],print=function(){p.push.apply(p,arguments);};" +
        // Introduce the data as local variables using with(){}
        "with(obj){p.push('" +
        // Convert the template into pure JavaScript
        str
          .replace(/[\r\t\n]/g, " ")
          .split(openInterpolation).join("\t")
          .replace(RegExp('((^|'+closeInterpolation+')[^\t]*)\'','g'), "$1\r")
          .replace(/\t\:(.*?)\~\|/g, "',$1,'")
          .split("\t").join("');")
          .split(closeInterpolation).join("p.push('")
          .split("\r").join("\\'") + "');}return p.join('');";

      return new Function(
        "obj", //parameter list
        functionDefinition
      );
    };

    var cache = {};
    var makeTempl = function (str, data) {
      // load the template - and be sure to cache the result.
      cache[str] = cache[str] || makeFn(str);  
      var fn = cache[str];

      // Provide some basic currying to the user
      return data ? fn(data) : fn;
    };

    return makeTempl;
  })();

  templ.domTempl = function (str, data) {
    // Figure out if we're getting a template, or if we need to
    // load the template - and be sure to cache the result.
    var templText = document.getElementById(str).innerHTML;
    return templ(templText,data);
  };

  templ.select = function(str,data){
    var key = function(kvp){
      for(var k in kvp){
        return k;
      }
    }
    var val = function(kvp){
      for(var k in kvp){
        return kvp[k];
      }
    }
    var opts = [];
    for(var i in data){
      var kvp = data[i];
      var k = key(kvp);
      var v = val(kvp);
      var opt = { text: k, val: v};
      opts.push(opt);
    }
    var optionData = { options: opts };
    return templ.domTempl(str,optionData);
  }

  pc('templates',p(templ));

})();



var root;
;(function(){

  //This could be global or window
  root = this;

  //SO tired of typing this out, this shouldn't be here, but I don't care
  root.l = console.log.bind(console);

})();

////////////////////////////////////////////////////////////////////////////////

//PROMISES
;(function(){

  //A bare bones promise implementation without stupid opinions

  //This is all I need for promises to work and work well

  //Was going to call it Promise, but that's taken by a shitty global/native
  //implementation, complete with callback-only constructors, bullshit exception
  //machinery, unnecessary cancellation machinery, and even more unnecessary
  //combinators, thanks google, I really hope I never inherit a codebase which
  //uses that over-engineered nonsense in over-engineered ways. But let's face
  //it...that is exactly what will happen to me... because... you know...
  //we all need to be like Google and Facebook


  //Constructor of the FUTURE

  var Future = function(v){
    if(this instanceof Future){
      this.observers = [];
      this.value     = v;
      this.resolved  = v ? true : false;
    } else {
      return new Future(v);
    }
  };


  //Static Methods ... uh oh ... there's only two ...

  var isPromise = function(p){
    return ( typeof(p           ) === 'object'  )
      &&   ( typeof(p.then      ) === 'function')
      &&   ( typeof(p.resolved  ) === 'boolean' )
      &&   ( typeof(p.observers ) === 'object'  )
      ;
  };

  var all = function(promises){
    //Recursively bind the promises passed in to one another
    //So when all resolve, then the encompasing promise does too
    //This happens regardless of resolution order
    var head = promises.pop();
    return promises.length
      ? all(promises).then(function(results){
        return head.then(function(result){
          results.push(result);
          return results;
        });
      })
      : head.then(function(x){ return [x]; })
      ;
  };


  //Prototype Methods

  var resolve = function(v){
    //Fulfills a promise, sets the value to v,notifies the observers
    if(!this.resolved){
      this.value = v;
      this.resolved = true;
      for(var k in this.observers){
        var fn = this.observers[k];
        fn(v);
      }
    }
    return this;
  };

  var thenImmediateWithValue = function(fn,value){
    //To be called when p1's value is available
    var callBackResult = fn(value);
    //If cb result not promise make promise to make types consistent
    var cbPromise = Future.isPromise(callBackResult)
      ? callBackResult
      : Future(callBackResult)
      ;
    //Never trust cb context
    var me = this;
    cbPromise.then(function(v){
      me.resolve(v);
    });
  };
  var then = function(fn){
    //The 'bind' implementation, sequences a promise with another.
    //The callback from p1 executes after p1 resolves,
    //it is called with p1's value and returns p2
    //a third promise is returned which resolves once p2 has resolved.
    //p3 resolves with p2's value
    var nu = Future();
    if (this.resolved) {
      nu.thenImmediateWithValue(fn,this.value);
    } else {
      this.observers.push(function(value){
        nu.thenImmediateWithValue(fn,value);
      });
    }
    return nu;
  };


  //Connections

  Future.isPromise = isPromise;
  Future.all       = all;
  Future.prototype = {
    resolve: resolve,
    then:    then,
    //I don't know if I like this being a prototype method
    thenImmediateWithValue: thenImmediateWithValue
  };

  //Export to 'root' since google and node could never get their shit straight about Window vs Global
  root.p = Future;
  root.Future = Future;

})();

////////////////////////////////////////////////////////////////////////////////

//PROMISE CACHE / MODULE SYSTEM
;(function(){

  //The promise cache is just an object (key-value pairs)
  //where the keys are arbitrary module names easy to refer
  //to by the developer

  var pcache = {};
  var pc = function(promiseName,definition){
    var current = pcache[promiseName];
    if(arguments.length === 1){
      //requesting a promise:  pc('mySpoonModule')
      if(!current){
        //dummy promise, basically wait to be defined later
        pcache[promiseName] = p();
      }
    } else {
      //defining a promise:  pc('myModule',somePromise)
      if(!current){
        //if first time defining promise at given key
        pcache[promiseName] = definition;
      } else if(current && !current.resolved){
        //if overwriting promise at key,
        //or resolving dummy promise (as for module loading)
        var sideEffecting = definition
          .then(function(result){
            current.resolve(result);
            return p(result);
          });
        pcache[promiseName] = sideEffecting;
      } else {
        /* do nothing, promise exists, */
        /* so just return it           */
      }
    }
    return pcache[promiseName];
  };

  pc.all = function(){
    //requesting multiple: pc('a','b','c')
    var promises = [];
    for(var i in arguments){
      var moduleName = arguments[i];
      var modulePromise = pc(moduleName);
      promises.push(modulePromise);
    }
    return p.all(promises);
  };

  //export
  root.pc = pc;

})();


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
  var toPromise = function(fn){
    var returnPromise = p();
    this.calls(function(v){
      var actualPromise = fn(v);
      actualPromise.then(function(a){
        returnPromise.resolve(a);
      });
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




         pc('parsers')         .then(function(p){
  return pc('blips')           .then(function(b){
    l('resolved parsers');
    l('resolved blips');
  }); });


;(function(){
  p.fromNodeModule = function(moduleName){
    //From imperative to functional; just beautiful!
    var nodeModule = require(moduleName);
    return p(nodeModule);
  };
  pc.fromNodeModule = function(moduleName){
    //From imperative to functional; just beautiful!
    var nodeModulePromise = p.fromNodeModule(moduleName);
    pc(moduleName,nodeModulePromise);
    return pc(moduleName);
  };
  //Borrowing verbiage from 'q' library
  root.deNodeify = function(fn){
    var result = function(){
      var a = Array.prototype.slice.call(arguments);
      var e = a.shift();
      if(e) l('Error: ',e);
      return fn.apply(this,a);
    };
    return result;
  }
})();


//;(function(){
//  //var SerialPort = require('serialport');
//         pc.fromNodeModule('serialport').then(function(SerialPort){
//  return pc('blips')                    .then(function(b){
//    var d = root.deNodeify;
//    //Detecting open errors can be moved to the constructor's callback.
//    var port = '/dev/ttyUSB0';
//    var baud = 9600;
//    var port = new SerialPort(port,{baudRate:baud,autoOpen:false});
////    var eventToBlip = function(port,eventName){
////      var result = new b();
////      port.on(eventName, function(val) {
////        l('on '+eventName+': ', arguments );
////        result.set(val);
////      });
////      return result;
////    };
//    var o = port.open(d(function () {
//      l('Port created: ', arguments);
////      var err = eventToBlip(port,'error');
////      err.calls(function(val){ l('errBlip: ',arguments); });
////      var op = eventToBlip(port,'open');
////      op.calls(function(val){ l('openBlip: ',arguments); });
//      var parser = new SerialPort.parsers.Readline();
//      port.pipe(parser);
////      var dat = eventToBlip(parser,'data');
////      dat.calls(function(val){ l('dataBlip: ',arguments); });
//      parser.on('data', function (data) {
//        l('Data:', arguments);
//        if(data.includes('!')){
//          port.close(d(function() {
//            l('port closed: ',arguments);
//          }));
//        }
//      });
//      port.write('hi ', d(function() {
//        l('message written',arguments);
//      }));
//    port.on('error', function() { l('on Error: ', arguments ); })
//    port.on('open', function() { l('Open:', arguments); });
//    }));
//  }); });
//})();


;(function(){
  //Client module
  var pcfs = pc.fromNodeModule('fs');
         pcfs        .then(function(fs){
  return pc('blips') .then(function(b){
    var ttyUsb = '/dev/ttyUSB0';
    var fsIn = fs.createReadStream(ttyUsb);
    fsIn.on('open',function(){
      l('input ready: ',arguments);
      b.fileData = function(fsIn){
        var fd = new b();
        fsIn
          .on('data',function(err,data){
            fd.set(err || data);
          });
        return fd;
      };
      var tty = b.fileData(fsIn);
      var str = tty
        .map(function(dat){
          var str = dat.toString();
          return str;
        });
      str
        .calls(function(dat){
          l('str: ',dat);
          var pass = dat.includes('Hello World!');
          l('pass: ',pass);
        });
    });

    var fsOut = fs.createWriteStream(ttyUsb);
    fsOut.on('open',function(){
      l('output ready: ',arguments);
      b.fileWrite = function(fsOut){
        var fd = new b();
        fd.calls(function(d){
          fsOut.write(d);
        });
        return fd;
      };
      var out = b.fileWrite(fsOut);
      out.set('hi ');
    });

    //process.stdin.addEventListener('data',function(){
    var stdin = process.openStdin();
    //stdin.addListener('data',function(){
    process.stdin.on('data',function(){
      l('stdin data: ',arguments);
    });
    process.stdin.resume();
    //out.set('s');
    //out.set('p');
    //out.set(' ');
    //out.set('h');
    //out.set('i');
    //out.set(' ');
    //out.set('o');
    //out.set('n');
    //out.set('e');
    //out.set(' ');
    //out.set('d');
    //out.set('s');
    //out.set('p');
    //out.set(' ');
  }); });
})();






;(function(){

  var Parser = function(parsingFn){
    //Constructor: allow the optional use of the 'new' keyword
    if(!(this instanceof Parser)) return new Parser(parsingFn);
    this.position    = 0;
    this.parse       = parsingFn;
    this.parseFailed = false;
  };

  Parser.prototype.as = (function(){
    //This is the bind function implementation
    //This is where the magic begins
    //I've renamed the implementation as 'as' 
    //since we are making parsers.
    //This will make the API a bit more fluent 
    //since people will be able to write code like this:
    //  dateParser.as((date)=>{});
    //
    var updateWith = function(parser){
      //If I recall correctly I couldn't do trampolining for some reason,
      //and functional state threading would have required too many parameters
      //so I stuffed all the state threading into a helper function like this
      this.position    = parser.position;
      this.input       = parser.input;
      this.parseFailed = parser.parseFailed;
      this.position    = parser.position;
      this.parseError  = parser.parseError;
      return this; 
    }
    var dispatchUsing = function(parser){
      //In this fn this and parser are swapped with respect to their usual meanings
      this.updateWith(parser);
      var returnValue = this.parse();
      parser.updateWith(this);
      return returnValue;
    }
    var defaultError = function(){
      //just in case the parser implementor was lazy and didn't do this themselves
      var current     = this.position;
      var begin       = current - 20;
      var end         = current + 20;
      var input       = this.input;
      var errorPrefix = input.substring(begin,current);
      var errorSuffix = input.substring(current,end);
      return "FAIL @: " + errorPrefix + '|' + errorSuffix;
    }
    return function(callback){
      var previous = this;
      return Parser(function(){
        //Don't pass input or any other state into callbacks,
        //maintain singluar (or as close thereto) references.

        //assign state as if in callback from previous parser 
        var parsedValue = previous.dispatchUsing(this);

        if(this.parseFailed){
          if(!this.parseError) this.parseError = this.defaultError();
          return this.parseError;
        } else {
          //get the next parser
          var nextParser = callback(parsedValue);

          //setup & execute the next parser
          var nextParsed = nextParser.dispatchUsing(this);

          //update the parser being returned(3) which is 
          //composing the previous(1) and the next(2) parsers 
          return nextParsed;
        }
      });
    }
  })();
  Parser.result = function(val){
    //This is the 'return' implementation, 
    //the other half of the bind+return monad interface
    return Parser(function(){
      return val;
    });
  }
  Parser.prototype.run = function(input){
    this.position = 0;
    this.input    = input;
    var parsed    = this.parse();
    return parsed;
  }
  
////////////////////////////////////////////////////////////////////////////////

  Parser.stringp = function(search){
    //Search for a specific string 'search'
    return Parser(function(){
      var input    = this.input;
      var begin    = this.position;
      var end      = begin + search.length;
      var possible = input.substring(begin,end);
      var match = search === possible;
      if(match){
        //Advance the cursor and return the matched value
        this.position += search.length;
        return search;
      } else {
        this.parseFailed = true;
      }
    });
  };

  //Parser.prototype.sp = function(){
  //  //'sp' means 'space character'
  //  return this.left(Parser.stringp(' '));
  //};
  Parser.prototype.or = function(parser){
    var previous = this;
    return Parser(function(){
      var fallbackPosition = this.position;
      var firstTry = previous.dispatchUsing(this);
      if(this.parseFailed) {
        this.position = fallbackPosition;
        this.parseFailed = false;
        var secondTry = parser.dispatchUsing(this);
        return secondTry;
      } else {
        return firstTry;
      }
    });
  };
  Parser.many = function(parser){
    return Parser(function(){
      var result = [];
      var fallbackPosition = this.position;
      while(!this.parseFailed){
        var val = parser.dispatchUsing(this);
        if(this.parseFailed){
          this.position = fallbackPosition;
        } else {
          result.push(val);
          fallbackPosition = this.position;
        }
      }
      this.parseFailed = false;
      return result;
    });  
  };
  Parser.optional = function(str){
    var s   = Parser.stringp;
    return s(str).or(s(''));
  };
  Parser.prototype.left = function(nextParser){
    //'left' means 'ignore-right', and 'right' means 'ignore-left' 
    //so  in parseA.left(parseB), we only get 'A'
    //and in parseA.right(parseB), we only get 'B'
    return this      .as(function(l){
    return nextParser.as(function(r){
    return Parser.result(l);
    });}); 
  };
  Parser.prototype.right = function(nextParser){
    //'left' means 'ignore-right', and 'right' means 'ignore-left' 
    //so  in parseA.left(parseB), we only get 'A'
    //and in parseA.right(parseB), we only get 'B'
    return this      .as(function(l){
    return nextParser.as(function(r){
    return Parser.result(r);
    });}); 
  };
  Parser.prototype.y = function(nextParser){
    //'y' is spanish for 'and'
    return this      .as(function(t){
    return nextParser.as(function(n){
    return Parser.result(t + n);
    });}); 
  };

  pc('parsers',p(Parser));

})();




var root;
;(function(){

  //This could be global or window
  root = this;

  //SO tired of typing this out, this shouldn't be here, but I don't care
  root.l = console.log.bind(console);

})();

////////////////////////////////////////////////////////////////////////////////

//PROMISES
;(function(){

  //A bare bones promise implementation without stupid opinions

  //This is all I need for promises to work and work well

  //Was going to call it Promise, but that's taken by a shitty global/native
  //implementation, complete with callback-only constructors, bullshit exception
  //machinery, unnecessary cancellation machinery, and even more unnecessary
  //combinators, thanks google, I really hope I never inherit a codebase which
  //uses that over-engineered nonsense in over-engineered ways. But let's face
  //it...that is exactly what will happen to me... because... you know...
  //we all need to be like Google and Facebook


  //Constructor of the FUTURE

  var Future = function(v){
    if(this instanceof Future){
      this.observers = [];
      this.value     = v;
      this.resolved  = v ? true : false;
    } else {
      return new Future(v);
    }
  };


  //Static Methods ... uh oh ... there's only two ...

  var isPromise = function(p){
    return ( typeof(p           ) === 'object'  )
      &&   ( typeof(p.then      ) === 'function')
      &&   ( typeof(p.resolved  ) === 'boolean' )
      &&   ( typeof(p.observers ) === 'object'  )
      ;
  };

  var all = function(promises){
    //Recursively bind the promises passed in to one another
    //So when all resolve, then the encompasing promise does too
    //This happens regardless of resolution order
    var head = promises.pop();
    return promises.length
      ? all(promises).then(function(results){
        return head.then(function(result){
          results.push(result);
          return results;
        });
      })
      : head.then(function(x){ return [x]; })
      ;
  };


  //Prototype Methods

  var resolve = function(v){
    //Fulfills a promise, sets the value to v,notifies the observers
    if(!this.resolved){
      this.value = v;
      this.resolved = true;
      for(var k in this.observers){
        var fn = this.observers[k];
        fn(v);
      }
    }
    return this;
  };

  var thenImmediateWithValue = function(fn,value){
    //To be called when p1's value is available
    var callBackResult = fn(value);
    //If cb result not promise make promise to make types consistent
    var cbPromise = Future.isPromise(callBackResult)
      ? callBackResult
      : Future(callBackResult)
      ;
    //Never trust cb context
    var me = this;
    cbPromise.then(function(v){
      me.resolve(v);
    });
  };
  var then = function(fn){
    //The 'bind' implementation, sequences a promise with another.
    //The callback from p1 executes after p1 resolves,
    //it is called with p1's value and returns p2
    //a third promise is returned which resolves once p2 has resolved.
    //p3 resolves with p2's value
    var nu = Future();
    if (this.resolved) {
      nu.thenImmediateWithValue(fn,this.value);
    } else {
      this.observers.push(function(value){
        nu.thenImmediateWithValue(fn,value);
      });
    }
    return nu;
  };


  //Connections

  Future.isPromise = isPromise;
  Future.all       = all;
  Future.prototype = {
    resolve: resolve,
    then:    then,
    //I don't know if I like this being a prototype method
    thenImmediateWithValue: thenImmediateWithValue
  };

  //Export to 'root' since google and node could never get their shit straight about Window vs Global
  root.p = Future;
  root.Future = Future;

})();

////////////////////////////////////////////////////////////////////////////////

//PROMISE CACHE / MODULE SYSTEM
;(function(){

  //The promise cache is just an object (key-value pairs)
  //where the keys are arbitrary module names easy to refer
  //to by the developer

  var pcache = {};
  var pc = function(promiseName,definition){
    var current = pcache[promiseName];
    if(arguments.length === 1){
      //requesting a promise:  pc('mySpoonModule')
      if(!current){
        //dummy promise, basically wait to be defined later
        pcache[promiseName] = p();
      }
    } else {
      //defining a promise:  pc('myModule',somePromise)
      if(!current){
        //if first time defining promise at given key
        pcache[promiseName] = definition;
      } else if(current && !current.resolved){
        //if overwriting promise at key,
        //or resolving dummy promise (as for module loading)
        var sideEffecting = definition
          .then(function(result){
            current.resolve(result);
            return p(result);
          });
        pcache[promiseName] = sideEffecting;
      } else {
        /* do nothing, promise exists, */
        /* so just return it           */
      }
    }
    return pcache[promiseName];
  };

  pc.all = function(){
    //requesting multiple: pc('a','b','c')
    var promises = [];
    for(var i in arguments){
      var moduleName = arguments[i];
      var modulePromise = pc(moduleName);
      promises.push(modulePromise);
    }
    return p.all(promises);
  };

  //export
  root.pc = pc;

})();


;(function(){

  var templ = (function(){
    //modified heavily from npm resig

    var makeFn = function(str){
      // Generate a reusable function that will serve as a template
      // generator (and which will be cached).
      var openInterpolation  = "\|\~";
      var evaluationFlag     = ":";
      var closeInterpolation = "\~\|";

      var functionDefinition = 
        "var p=[],print=function(){p.push.apply(p,arguments);};" +
        // Introduce the data as local variables using with(){}
        "with(obj){p.push('" +
        // Convert the template into pure JavaScript
        str
          .replace(/[\r\t\n]/g, " ")
          .split(openInterpolation).join("\t")
          .replace(RegExp('((^|'+closeInterpolation+')[^\t]*)\'','g'), "$1\r")
          .replace(/\t\:(.*?)\~\|/g, "',$1,'")
          .split("\t").join("');")
          .split(closeInterpolation).join("p.push('")
          .split("\r").join("\\'") + "');}return p.join('');";

      return new Function(
        "obj", //parameter list
        functionDefinition
      );
    };

    var cache = {};
    var makeTempl = function (str, data) {
      // load the template - and be sure to cache the result.
      cache[str] = cache[str] || makeFn(str);  
      var fn = cache[str];

      // Provide some basic currying to the user
      return data ? fn(data) : fn;
    };

    return makeTempl;
  })();

  templ.domTempl = function (str, data) {
    // Figure out if we're getting a template, or if we need to
    // load the template - and be sure to cache the result.
    var templText = document.getElementById(str).innerHTML;
    return templ(templText,data);
  };

  templ.select = function(str,data){
    var key = function(kvp){
      for(var k in kvp){
        return k;
      }
    }
    var val = function(kvp){
      for(var k in kvp){
        return kvp[k];
      }
    }
    var opts = [];
    for(var i in data){
      var kvp = data[i];
      var k = key(kvp);
      var v = val(kvp);
      var opt = { text: k, val: v};
      opts.push(opt);
    }
    var optionData = { options: opts };
    return templ.domTempl(str,optionData);
  }

  pc('templates',p(templ));

})();


;(function(resolve){
  var template = function(string,object){
    for(var key in object){
      var pattern = '{{' + key + '}}';
      var regex = new RegExp(pattern,'g');
      var value = object[key];
      return templateString.replace(regex,value);
    }
  }
  var is = function(x){
    return typeof(x)!=='undefined';
  }
  var not = function(x){
    return typeof(x)==='undefined';
  }
  var log = console.log.bind(console);

  pc('util',p({
      template: template
    , is: is
    , not: not
    , log: log
  }));

})();

;(function(resolve){
  var template = function(string,object){
    for(var key in object){
      var pattern = '{{' + key + '}}';
      var regex = new RegExp(pattern,'g');
      var value = object[key];
      return templateString.replace(regex,value);
    }
  }
  var is = function(x){
    return typeof(x)!=='undefined';
  }
  var not = function(x){
    return typeof(x)==='undefined';
  }
  var log = console.log.bind(console);

  pc('util',p({
      template: template
    , is: is
    , not: not
    , log: log
  }));

})();
