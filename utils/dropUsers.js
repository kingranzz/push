const logger = require("./logger");
const { writeFile } = require("fs");
const { join } = require("path");

module.exports = () => {
  return new Promise((resolve, reject) => {
    require("./readUsers")()
      .then((res) => {
        writeFile(join(__dirname, "../data/users.json"), "[]", (err) => {
          if (err) {
            logger("error", "DROPUSERS", err);
            reject(err);
          }
          resolve({ data: res.data });
        });
      })
      .catch((err) => {
        reject(err);
      });
  });
};
