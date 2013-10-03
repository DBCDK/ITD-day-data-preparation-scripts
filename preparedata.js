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

if(process.argv[2] === "adhl" && process.argv[3]) {
  foreachLineInFile(process.argv[3], function(line) {
    console.log(line);
  });
} else if(process.argv[2] === "danbib") {
} else {
  console.log("Parameter neede, - read " + __dirname + "/README.md for usage info");
}
