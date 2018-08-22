


;(function(){
  
  var pc = promiseCache;

  //Client module
  var pcfs     = pc.fromNodeModule('fs');
  var pcConsts = pc.fromNodeModule('constants');

         pcfs               .then(function(fs){
  return pcConsts           .then(function(c){
  return pc('blips')        .then(function(_){
  return pc('blip-util')    .then(function(b){
  return pc('promise-util') .then(function(_){

    var ttyUsb = '/dev/ttyUSB0';
    //No combination of these seemed to help to eliminate the timeout below
    //var fsIn = fs.createReadStream(ttyUsb,{flags:c.O_NOCTTY|c.O_RDWR|c.O_NONBLOCK});
    //var fsIn = fs.createReadStream(ttyUsb,{flags:c.O_NOCTTY|c.O_RDWR});
    var fsIn = fs.createReadStream(ttyUsb);
    var openInput = b.nodeEvent(fsIn,'open').toPromise();
    var input = new b();
    
    //This didn't help to elminate wtfTimeout
    //var fsOut = fs.createWriteStream(ttyUsb,{flags:c.O_WRONLY|c.O_NOCTTY});
    var fsOut = fs.createWriteStream(ttyUsb);
    var output = new b();
    output.writesTo(fsOut);
    var openOutput = b.nodeEvent(fsOut,'open').toPromise();
    var wtfTimeout = p.setTimeout(500);

    var connectedInput = openInput.then(function(){
      l('read stream open: ',arguments);
      var ttyIn = b.nodeEvent(fsIn,'data');
      ttyIn.sets(input);
      return p(input);
    });

    var strInput = input.map(function(dat){
      var str = dat.toString();
      return str;
    });

    var send = function(requestStr){
      //Use the event loop as the IO queue, create "natural" back pressure
      l('send: ',requestStr);
      var response = strInput.toPromise();
      output.set(requestStr);
      return response;
    };

    p.all([connectedInput,openOutput,wtfTimeout]).then(function(args){
      //Use this as a basis for UART testing
      l('openOutput fd: ',args[1]);
              send('hi ').then(function(a){
              l('response a: ',a);
      return  send('hi ').then(function(b){
              l('response b: ',b);
      return  send('hi ').then(function(c){
              l('response c: ',c);
      }); }); });
    });

    process.stdin.pipe(fsOut);

  }); }); }); }); });

})();



