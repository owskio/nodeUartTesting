

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

