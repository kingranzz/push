const logger = require("./logger");
const { readFile } = require("fs");
const { join } = require("path");

module.exports = () => {
  return new Promise((resolve, reject) => {
    readFile(join(__dirname, "../data/users.json"), "utf8", (err, data) => {
      if (err) {
        logger("error", "READUSERS", err);
        reject(err);
      }
      resolve({ data: JSON.parse(data) });
    });
  });
};
