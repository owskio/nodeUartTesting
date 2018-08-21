


//         pc('parsers')         .then(function(p){
//  return pc('blips')           .then(function(b){
//    l('resolved parsers');
//    l('resolved blips');
//  }); });


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

  pc('blips') .then(function(b){

    b.fileData = function(fsIn){
      var fd = new b();
      fsIn.on('data',function(err,data){
        fd.set(err || data);
      });
      return fd;
    };
    b.fileWrite = function(fsOut){
      var fd = new b();
      fd.calls(function(d){
        fsOut.write(d);
      });
      return fd;
    };

    pc('blip-fs',p(b));

  }); 
})();

;(function(){

  //Client module
  var pcfs = pc.fromNodeModule('fs');
  var pcConsts = pc.fromNodeModule('constants');

         pcfs          .then(function(fs){
  return pcConsts      .then(function(c){
  return pc('blips')   .then(function(b){
  return pc('blip-fs') .then(function(b){

    var ttyUsb = '/dev/ttyUSB0';
    var fsIn = fs.createReadStream(ttyUsb);
    //No combination of these seemed to help to eliminate the timeout below
    //var fsIn = fs.createReadStream(ttyUsb,{flags:c.O_RDRW});
    //var fsIn = fs.createReadStream(ttyUsb,{flags:c.O_NOCTTY});
    //var fsIn = fs.createReadStream(ttyUsb,{flags:c.O_NOCTTY|c.O_RDWR});
    //var fsIn = fs.createReadStream(ttyUsb,{flags:c.O_NOCTTY|c.O_RDWR|c.O_NONBLOCK});
    //var fsIn = fs.createReadStream(ttyUsb,{flags:c.O_NOCTTY|c.O_RDONLY});
    fsIn.on('open',function(){
      l('input ready: ',arguments);
      var tty = b.fileData(fsIn);
      var str = tty.map(function(dat){
        var str = dat.toString();
        return str;
      });
      str.calls(function(dat){
        l('str: ',dat);
        var pass = dat.includes('Hello World!');
        l('pass: ',pass);
      });

    //var fsOut = fs.createWriteStream(ttyUsb,{flags:c.O_NOCTTY});
    //var fsOut = fs.createWriteStream(ttyUsb,{flags:c.O_WRONLY});
    var fsOut = fs.createWriteStream(ttyUsb,{flags:c.O_WRONLY|c.O_NOCTTY});
    fsOut.on('drain',function(){ l('drain: ',arguments); });
    fsOut.on('error',function(){ l('error: ',arguments); });
    fsOut.on('*',function(){ l('close: ',arguments); });
    fsOut.on('finish',function(){ l('finish: ',arguments); });
    fsOut.on('readable',function(){ l('readable: ',arguments); });
    fsOut.on('data',function(){ l('data: ',arguments); });
    fsOut.on('pipe',function(){ fsOut.write('hi \n'); });

    fsOut.on('open',function(){
      l('output ready: ',arguments);
      var out = b.fileWrite(fsOut);
      root.setTimeout(function(){
        out.set('hi ');
      },500);
      root.setTimeout(function(){
        out.set('hi ');
      },1000);
      fsOut.write('hi \n');
    });
    process.stdin.pipe(fsOut);

    });

    //process.stdin.resume();
    //process.stdin.on('data',function(){
    //  l('stdin data: ',arguments);
    //});
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
  });
  });
  });
  });
})();





