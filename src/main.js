


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


;(function(){
  //var SerialPort = require('serialport');
         pc.fromNodeModule('serialport').then(function(SerialPort){
  return pc('blips')                    .then(function(b){
    var d = root.deNodeify;
    //Detecting open errors can be moved to the constructor's callback.
    var port = '/dev/ttyUSB0';
    var baud = 9600;
    var port = new SerialPort(port,{baudRate:baud,autoOpen:false});
//    var eventToBlip = function(port,eventName){
//      var result = new b();
//      port.on(eventName, function(val) {
//        l('on '+eventName+': ', arguments );
//        result.set(val);
//      });
//      return result;
//    };
    var o = port.open(d(function () {
      l('Port created: ', arguments);

//      var err = eventToBlip(port,'error');
//      err.calls(function(val){ l('errBlip: ',arguments); });
//      var op = eventToBlip(port,'open');
//      op.calls(function(val){ l('openBlip: ',arguments); });

      var parser = new SerialPort.parsers.Readline();
      port.pipe(parser);

//      var dat = eventToBlip(parser,'data');
//      dat.calls(function(val){ l('dataBlip: ',arguments); });

      parser.on('data', function (data) {
        l('Data:', arguments);
        if(data.includes('!')){
          port.close(d(function() {
            l('port closed: ',arguments);
          }));
        }
      });
      port.write('hi ', d(function() {
        l('message written',arguments);
      }));
    port.on('error', function() { l('on Error: ', arguments ); })
    port.on('open', function() { l('Open:', arguments); });
    }));
  }); });

})();


//;(function(){
//  //Client module
//  var pcfs = pc.fromNodeModule('fs');
//         pcfs        .then(function(fs){
//  return pc('blips') .then(function(b){
//    b.fileData = function(fileName){
//      var fd = new b();
//      fs
//        .createReadStream(fileName)
//        .on('data',function(err,data){
//          fd.set(err || data);
//        });
//      return fd;
//    };
//    var tty = b.fileData('/dev/ttyUSB0');
//    var str = tty
//      .map(function(dat){
//        var str = dat.toString();
//        return str;
//      });
//    str
//      .calls(function(dat){
//        l('str: ',dat);
//        var pass = dat.includes('Hello World!');
//        l('pass: ',pass);
//      });
//    b.fileWrite = function(fileName){
//      var fd = new b();
//      var fsOut = fs.createWriteStream(fileName)
//        ;
//      fd.calls(function(d){
//        fsOut.write(d);
//      });
//      return fd;
//    };
//    var out = b.fileWrite('/dev/ttyUSB0');
//    out.set('dsp ');
//    //out.set('s');
//    //out.set('p');
//    //out.set(' ');
//    //out.set('h');
//    //out.set('i');
//    //out.set(' ');
//    //out.set('o');
//    //out.set('n');
//    //out.set('e');
//    //out.set(' ');
//    //out.set('d');
//    //out.set('s');
//    //out.set('p');
//    //out.set(' ');
//  }); });
//})();
