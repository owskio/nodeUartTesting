
l('modules loading');


         pc('parsers')         .then(function(p){
  return pc('blips')           .then(function(b){
    l('resolved parsers');
    l('resolved blips');
    l('modules loaded');
  }); }); 

/*
 *





var SerialPort = require('serialport');
//Detecting open errors can be moved to the constructor's callback.
var port = new SerialPort('/dev/ttyUSB0',{baudRate:9600}, function (err) {
  if (err) {
    return console.log('Error: ', err.message);
  }
  console.log('Port created: ', arguments);
});

//Open errors will be emitted as an error event
port.on('error', function(err) {
  console.log('on Error: ', err.message);
})


////When disabling the autoOpen option you'll need to open the port on your own.
//var SerialPort = require('serialport');
//var port = new SerialPort('/dev/tty-usbserial1', { autoOpen: false });
//port.open(function (err) {
//  if (err) {
//    return console.log('Error opening port: ', arguments);
//  }
//  //// Because there's no callback to write, write errors will be emitted on the port:
//  ////port.write('hi ');
//});
// The open event is always emitted
port.on('open', function(d) {
  console.log('Open:', arguments);

  ////Get updates of new data from the serial port as follows:
  //// Switches the port into "flowing mode"
  //port.on('data', function (data) {
  //  console.log('Data:', arguments);
  //});
  // Read data that is available but keep the stream from entering "flowing mode"
  //port.on('readable', function () {
  //  console.log('Readable:', port.read());
  //});

});

var Readline = SerialPort.parsers.Readline;
var parser = new Readline();
port.pipe(parser);
parser.on('data', function (data) {
  console.log('Data:', arguments);
});

port.write('hi ', function(err) {
  if (err) {
    return console.log('Error on write: ', err.message);
  }
  console.log('message written',arguments);
});




 *
 *
 * */

;(function(){
  root.nodeRequireToPromise = function(moduleName){
    //From imperative to functional; just beautiful!
    var nodeModule = require(moduleName);
    pc(moduleName,p(nodeModule));
  };
  nodeRequireToPromise('fs');
})();

;(function(){

  //Client module
  l('running main');

         pc('fs')    .then(function(fs){
  return pc('blips') .then(function(b){

    l('resolved deps');

    b.fileData = function(fileName){
      var fd = new b();
      fs
        .createReadStream(fileName)
        .on('data',function(err,data){
          fd.set(err || data);
        });
      return fd;
    };
    var tty = b.fileData('/dev/ttyUSB0');
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
    b.fileWrite = function(fileName){
      var fd = new b();
      var fsOut = fs.createWriteStream(fileName)
        ;
      fd.calls(function(d){
        fsOut.write(d);
      });
      return fd;
    };
    var out = b.fileWrite('/dev/ttyUSB0');

    out.set('dsp ');
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
