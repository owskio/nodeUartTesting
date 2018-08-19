
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
