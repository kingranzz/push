const readLine = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout,
});

module.exports = (text) => {
  return new Promise((resolve) => {
    readLine.question(`\n\x1b[1m\x20${text}\x1b[0m`, (answer) => {
      resolve(answer);
      readLine.close();
    });
  });
};
