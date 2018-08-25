
;(function(){

  //Integration Tests
  
  var pc = root.promiseCache;
  
  return pc('testSetup').then(function(t){

    var send = t.send;

    var comparable = function(str){
      str = str.replace(/ /g,'_');
      str = str.replace(/\r\n/g,'|r|n');
      str = str.replace(/\t/g,'|t');
      str = '['+str+']';
      return str;
    };
    var equals = function(a,b){
      var pass = a === b;
      var output = pass ? 'PASS':'FAIL';
      l(output);
      return pass;
    }
    var test = function(sendStr,expected){
      return send(sendStr).then(function(c){ 
        var testResponse = comparable(c)
        l('received: ', testResponse);
        var testResult = expected 
          ? testResponse === expected
          : testResponse
          ;
        return testResult;
      });
    };

    //Test that we are serializing commands
    //and able to communicate with the chip
    var seqTest = send('hi ').then(function(a){ l('response a: ',a);
    return        send('hi ').then(function(b){ l('response b: ',b);
    return        send('hi ').then(function(c){ l('response c: ',c);
      var response = comparable(a);
      return equals(response,'[hi_|r|nhi|r|n|r|nHello_World!|r|n]');
    }); }); });

    var peekTest = seqTest      .then(function(_){
    return         test('peek ').then(function(c){ 
    return         test('one ' ).then(function(r){ 
    return         test('peek ').then(function(c){ 
    return         test('one ' ).then(function(r){ 
    return         test('peek ','[peek_|r|npeek|r|n0101]').then(function(c){ 
      l('test passed?: ',c);
    }); }); }); }); }); });

  });

})();

;(function(){

  //Integration Test Suite setup

  var pc = root.promiseCache;

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

    //This didn't help to elminate wtfTimeout
    //var fsOut = fs.createWriteStream(ttyUsb,{flags:c.O_WRONLY|c.O_NOCTTY});
    var fsOut = fs.createWriteStream(ttyUsb);
    var output = new b();
    output.writesTo(fsOut);
    var openOutput = b.nodeEvent(fsOut,'open').toPromise();
    var wtfTimeout = p.setTimeout(1000);


    var send = function(requestStr){
      //Use the event loop as the IO queue, create "natural" back pressure
      l('send: ',requestStr);
      var response = strInput.toPromise();
      output.set(requestStr);
      return response;
    };

    //Pipe console input to chip
    process.stdin.pipe(fsOut);

    var ready = p.all([connectedInput,openOutput,wtfTimeout])
      .then(function(args){
        l('openOutput fd: ',args[1]);
        return p({
          connectedInput : connectedInput
        , openOutput : openOutput
        , send : send
        });
      });

    pc('testSetup',ready);

  }); }); }); }); });

})();



