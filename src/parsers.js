
;(function(){

  var Parser = function(parsingFn){
    //Constructor: allow the optional use of the 'new' keyword
    if(!(this instanceof Parser)) return new Parser(parsingFn);
    this.position    = 0;
    this.parse       = parsingFn;
    this.parseFailed = false;
  };

  Parser.prototype.as = (function(){
    //This is the bind function implementation
    //This is where the magic begins
    //I've renamed the implementation as 'as' 
    //since we are making parsers.
    //This will make the API a bit more fluent 
    //since people will be able to write code like this:
    //  dateParser.as((date)=>{});
    //
    var updateWith = function(parser){
      //If I recall correctly I couldn't do trampolining for some reason,
      //and functional state threading would have required too many parameters
      //so I stuffed all the state threading into a helper function like this
      this.position    = parser.position;
      this.input       = parser.input;
      this.parseFailed = parser.parseFailed;
      this.position    = parser.position;
      this.parseError  = parser.parseError;
      return this; 
    }
    var dispatchUsing = function(parser){
      //In this fn this and parser are swapped with respect to their usual meanings
      this.updateWith(parser);
      var returnValue = this.parse();
      parser.updateWith(this);
      return returnValue;
    }
    var defaultError = function(){
      //just in case the parser implementor was lazy and didn't do this themselves
      var current     = this.position;
      var begin       = current - 20;
      var end         = current + 20;
      var input       = this.input;
      var errorPrefix = input.substring(begin,current);
      var errorSuffix = input.substring(current,end);
      return "FAIL @: " + errorPrefix + '|' + errorSuffix;
    }
    return function(callback){
      var previous = this;
      return Parser(function(){
        //Don't pass input or any other state into callbacks,
        //maintain singluar (or as close thereto) references.

        //assign state as if in callback from previous parser 
        var parsedValue = previous.dispatchUsing(this);

        if(this.parseFailed){
          if(!this.parseError) this.parseError = this.defaultError();
          return this.parseError;
        } else {
          //get the next parser
          var nextParser = callback(parsedValue);

          //setup & execute the next parser
          var nextParsed = nextParser.dispatchUsing(this);

          //update the parser being returned(3) which is 
          //composing the previous(1) and the next(2) parsers 
          return nextParsed;
        }
      });
    }
  })();
  Parser.result = function(val){
    //This is the 'return' implementation, 
    //the other half of the bind+return monad interface
    return Parser(function(){
      return val;
    });
  }
  Parser.prototype.run = function(input){
    this.position = 0;
    this.input    = input;
    var parsed    = this.parse();
    return parsed;
  }
  
////////////////////////////////////////////////////////////////////////////////

  Parser.stringp = function(search){
    //Search for a specific string 'search'
    return Parser(function(){
      var input    = this.input;
      var begin    = this.position;
      var end      = begin + search.length;
      var possible = input.substring(begin,end);
      var match = search === possible;
      if(match){
        //Advance the cursor and return the matched value
        this.position += search.length;
        return search;
      } else {
        this.parseFailed = true;
      }
    });
  };

  //Parser.prototype.sp = function(){
  //  //'sp' means 'space character'
  //  return this.left(Parser.stringp(' '));
  //};
  Parser.prototype.or = function(parser){
    var previous = this;
    return Parser(function(){
      var fallbackPosition = this.position;
      var firstTry = previous.dispatchUsing(this);
      if(this.parseFailed) {
        this.position = fallbackPosition;
        this.parseFailed = false;
        var secondTry = parser.dispatchUsing(this);
        return secondTry;
      } else {
        return firstTry;
      }
    });
  };
  Parser.many = function(parser){
    return Parser(function(){
      var result = [];
      var fallbackPosition = this.position;
      while(!this.parseFailed){
        var val = parser.dispatchUsing(this);
        if(this.parseFailed){
          this.position = fallbackPosition;
        } else {
          result.push(val);
          fallbackPosition = this.position;
        }
      }
      this.parseFailed = false;
      return result;
    });  
  };
  Parser.optional = function(str){
    var s   = Parser.stringp;
    return s(str).or(s(''));
  };
  Parser.prototype.left = function(nextParser){
    //'left' means 'ignore-right', and 'right' means 'ignore-left' 
    //so  in parseA.left(parseB), we only get 'A'
    //and in parseA.right(parseB), we only get 'B'
    return this      .as(function(l){
    return nextParser.as(function(r){
    return Parser.result(l);
    });}); 
  };
  Parser.prototype.right = function(nextParser){
    //'left' means 'ignore-right', and 'right' means 'ignore-left' 
    //so  in parseA.left(parseB), we only get 'A'
    //and in parseA.right(parseB), we only get 'B'
    return this      .as(function(l){
    return nextParser.as(function(r){
    return Parser.result(r);
    });}); 
  };
  Parser.prototype.y = function(nextParser){
    //'y' is spanish for 'and'
    return this      .as(function(t){
    return nextParser.as(function(n){
    return Parser.result(t + n);
    });}); 
  };

  pc('parsers',p(Parser));

})();


