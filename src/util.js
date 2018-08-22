
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

;(function(){
  root.p.setTimeout = function(ms){
    var result = new p();
    root.setTimeout(function(){
      result.resolve();
    },ms);
    return result;
  }
  pc('promise-util',p('get it from global/window/root'));
})();

;(function(){
  //blip extensions
  pc('blips').then(function(b){
    b.setTimeout = function(ms){
      root.setTimeout(function(){
        output.set('hi ');
      },ms);
    }
    b.nodeEvent = function(obj,eventName){
      var fd = new b();
      obj.on(eventName,function(err,data){
        fd.set(err || data);
      });
      return fd;
    };
    b.prototype.writesTo = function(nodeStream){
      this.calls(function(d){
        nodeStream.write(d);
      });
      return this;
    };
    pc('blip-util',p(b));
  });
})();

