


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
  //Promise extensions
  root.p.setTimeout = function(ms){
    var result = new p();
    root.setTimeout(function(){
      result.resolve();
    },500);
    return result;
  }
})();
;(function(){
  //blip extensions
  pc('blips') .then(function(b){
//    b.fileData = function(fsIn){
//      var fd = new b();
//      fsIn.on('data',function(err,data){
//        fd.set(err || data);
//      });
//      return fd;
//    };
    b.setTimeout = function(ms){
      root.setTimeout(function(){
        output.set('hi ');
      },500);
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
    //var fsIn = fs.createReadStream(ttyUsb,{flags:c.O_NOCTTY|c.O_RDWR|c.O_NONBLOCK});
    //fsIn.on('open',function(){
    var openInput = b.nodeEvent(fsIn,'open');
    var input = new b();
    openInput.calls(function(){
      l('openInput: ',arguments);
      var ttyIn = b.nodeEvent(fsIn,'data');//fileData(fsIn);
      ttyIn.sets(input);
    });
    var str = input.map(function(dat){
      var str = dat.toString();
      return str;
    });
    str.calls(function(dat){
      l('str: ',dat);
      var pass = dat.includes('Hello World!');
      l('pass: ',pass);
    });

    //var fsOut = fs.createWriteStream(ttyUsb,{flags:c.O_WRONLY|c.O_NOCTTY});
    var fsOut = fs.createWriteStream(ttyUsb);
    var output = new b();
    output.writesTo(fsOut);
    var openOutput = b.nodeEvent(fsOut,'open').toPromise();
    var wtfTimeout = p.setTimeout(500);
    p.all([openOutput,wtfTimeout])
      .then(function(){
        l('openOutput: ',arguments);
        root.setTimeout(function(){
          output.set('hi ');
        },500);
        output.set('hi ');
        output.set('hi ');
      });
    process.stdin.pipe(fsOut);

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





