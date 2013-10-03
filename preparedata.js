// {{{1 Utility functions
var fs;
var level;
var async;
level = require("levelup");
fs = require("fs");
async = require("async");

foreachLineInFile = function(filename, fn) {
  var stream;
  stream = fs.createReadStream(filename);
  readbuf = "";
  stream.on("data", function(data) {
    stream.pause()
    var lines;
  readbuf += data;
  lines = readbuf.split(RegExp("\\n", "g"));
  async.each(lines.slice(0, -1), fn, function foo() { 
    stream.resume();
  });
  readbuf = lines[lines.length - 1];
  });
  stream.on("end", function(){
    if(readbuf) {
      fn(readbuf);
    }
    fn(undefined);
  });
  stream.on("error", function(error){
    throw error;
  });
}
// {{{1 Actual implementation

// {{{2 ADHL
adhl = function(adhlFilename) {

  // {{{3 Extract data from datafile
  lineMatchRE = RegExp("([0-9]+)\t([0-9]+)\t([km])\t([0-9]+)-01-01\t[0-9]+\t([0-9]+)\t[0-9]+\t([0-9-]+)");
  lineMatch = function(line) {
    match = line.match(lineMatchRE);
    if(match) {
      return {
        patron: match[1],
          library: match[2],
          sex: (match[3] === "m") ? "m" : "f",
          birthyear: match[4].slice(0,4),
          lid: match[5],
          date: match[6]
      }
    }
  }
  incElem = function(obj, key) {
    obj[key] = (obj[key]||0) + 1;
  }
  lineno = 0;
  processAdhlFile = function(filename, callback, done) {
    foreachLineInFile(filename, function(line, linedone) {
      ++lineno;
      if(lineno % 100000 === 0) {
        console.log("processing line:", lineno, " time: ", new Date());
      }
      if(line === undefined) {
        return done()
      }
      obj = lineMatch(line);
      if(obj) {
        callback(obj, linedone);
      } else {
        linedone();
      }
    });
  }
  // {{{3 Initialise data base
  var patronDB = level("patronloans.leveldb", {errorIfExists: true});
  var lidDB = level("lid.leveldb", {errorIfExists: true});
  patronIds = {}
  patronCounter = 0;
  incomingAdhlObject = function(obj, done) {
    // anonymise laanerid, with sequential patron ids instead
    var age = (+ (obj.date.slice(0,4))) - obj.birthyear;
    if(age < 0 || age > 130) {
        //console.log("warning, bad birthyear (age:" + age + "), ignoring entry: " + JSON.stringify(obj));
        return done();
    }
    obj.patron = patronIds[obj.patron] || (patronIds[obj.patron] = ++patronCounter);
    patronDB.get(obj.patron, function(err, loans) {
      if(loans) {
        loans = JSON.parse(loans);
      } else {
        loans = {};
      }
      incElem(loans, obj.lid);
      patronDB.put(obj.patron, JSON.stringify(loans), function() {
        lidDB.get(obj.lid, function(err, book) {
          if(!book) {
            book = {
              lid: obj.lid,
              patrons: {},
              libraries: {},
              dates: {},
            }
          } else {
            book = JSON.parse(book);
          } 
          incElem(book.patrons, obj.sex + age);
          incElem(book.libraries, obj.library);
          incElem(book.dates, obj.library);
          lidDB.put(obj.lid, JSON.stringify(book), function() {
            done();
          });
        });
      });
    });
  }
  rwProcess = function(readStream, writeStream, fn) {
    readStream.on("data", function(data) {
      readStream.pause()
      writeStream.write(data.value + "\n", function() {
        readStream.resume();
      });
    });
    readStream.on("end", function() {
      writeStream.end();
    });
  }
  dumpData = function() {
    rwProcess(patronDB.createReadStream(), fs.createWriteStream("cooccur.jsons"));
    rwProcess(lidDB.createReadStream(), fs.createWriteStream("books.jsons"));
  }
  // {{{3 Main
  processAdhlFile(adhlFilename, incomingAdhlObject, function() {
    dumpData()
  });
}

// {{{2 danbib
danbib = function(path) {
var glob = require("glob");
var re = RegExp("<dc:([^ >]*) ?([^>]*)>([^<]*)</dc:", "g");
var ignoreValueRe = RegExp("^(MATCH|NOBIRTH|WORK)");
var filesProcessed = 0;
handleFile = function(filename, done) {
  fs.readFile(filename, "utf8", function(err, data) {
    var resultObj = {}
    var addProperty = function(name, value) {
      if(!resultObj[name]) {
        resultObj[name] = {};
      }
      resultObj[name][value] = true;
    }
    var match;
    if(err) {
      throw err;
    }
    while(match=re.exec(data)) {
      match = Array.prototype.slice.call(match, 1, 4);
      if(!match[2].match(ignoreValueRe)) {
        if(match[1]) {
          match[1] = match[1] + " "
        }
        addProperty(match[0], match[1] + match[2]);
      }
    }
    Object.keys(resultObj).forEach(function(key) {
      var values = Object.keys(resultObj[key]);
      values.forEach(function(value) {
        var lc = value.toLowerCase().replace(",", "");
        if(value !== lc) {
          if(resultObj[key][lc]) {
            delete resultObj[key][lc];
          }
        }
      });
      resultObj[key] = Object.keys(resultObj[key]);
    });
    entriesStream.write(JSON.stringify(resultObj) + "\n", done);
    ++filesProcessed;
    if(filesProcessed % 1000 === 0) {
      console.log(filesProcessed, "files processed");
    }
  });
};
  entriesStream = fs.createWriteStream("entries.jsons");
  glob(path + "/*/*/*", function(err, files) {
    if(err) { throw err; }
    i = 0;
    handleNext = function() {
      if(i < files.length) {
        handleFile(files[i], function() {
          ++i;
          process.nextTick(handleNext);
        });
      } else {
        entriesStream.end();
      }
    }
    handleNext();
  });
};
// {{{2 Main dispatch
if(process.argv[2] === "adhl" && process.argv[3]) {
  adhl(process.argv[3]);
} else if(process.argv[2] === "danbib" && process.argv[3]) {
  danbib(process.argv[3]);
} else {
  console.log("Parameter neede, - read " + __dirname + "/README.md for usage info");
}
