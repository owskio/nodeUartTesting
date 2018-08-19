

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
