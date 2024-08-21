const logger = require("./logger");
const { writeFile } = require("fs");
const { join } = require("path");

module.exports = (participants) => {
  return new Promise((resolve, reject) => {
    require("./readUsers")()
      .then((res) => {
        const users = res.data;
        const newUsers = participants.filter((part) => !users.includes(part));
        const alreadyUsers = participants.filter((part) =>
          users.includes(part)
        );
        if (!newUsers || newUsers.length === 0) {
          logger(
            "error",
            "SAVEUSERS",
            `Tidak ada data pengguna baru untuk disimpan`
          );
          reject("Tidak ada data pengguna baru untuk disimpan");
        }
        users.push(...newUsers);
        writeFile(
          join(__dirname, "../data/users.json"),
          JSON.stringify(users),
          (err) => {
            if (err) {
              logger("error", "SAVEUSERS", err);
              reject(err);
            }
            resolve({
              data: {
                users: users,
                newUsers: newUsers,
                alreadyUsers: alreadyUsers,
              },
            });
          }
        );
      })
      .catch((err) => {
        reject(err);
      });
  });
};
