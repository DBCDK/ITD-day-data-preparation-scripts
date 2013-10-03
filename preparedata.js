// {{{1 Utility functions
var fs;
fs = require("fs");
foreachLineInFile = function(filename, fn) {
  var stream;
  stream = fs.createReadStream(filename)
  readbuf = "";
  stream.on("data", function(data) {
    var lines;
    readbuf += data;
    lines = readbuf.split(RegExp("\\n", "g"));
    lines.slice(0, -1).forEach(fn);
    readbuf = lines[lines.length - 1];
  });
  stream.on("end", function(){
    if(readbuf) {
      fn(readbuf);
    }
    fn(undefined);
  });
}
// {{{1 Actual implementation

// {{{2 ADHL
// {{{3 Extract data from datafile
lineMatchRE = RegExp("([0-9]+)\t([0-9]+)\t([km])\t([0-9-]+)\t[0-9]+\t([0-9]+)\t[0-9]+\t([0-9-]+)");
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
processAdhlFile = function(filename, callback, done) {
  foreachLineInFile(filename, function(line) {
    if(line === undefined) {
      return done()
    }
    obj = lineMatch(line);
    if(obj) {
      callback(obj);
    }
  });
}

// {{{2 Main dispatch
if(process.argv[2] === "adhl" && process.argv[3]) {
  processAdhlFile(process.argv[3], function(obj) {
      console.log(obj);
      }, function() {
      console.log("done");
      });
} else if(process.argv[2] === "danbib") {
} else {
  console.log("Parameter neede, - read " + __dirname + "/README.md for usage info");
}
