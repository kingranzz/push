const { spawn } = require("child_process");

(function start() {
  const args = ["main.js", ...process.argv.slice(2)];
  const child = spawn("node", args, {
    stdio: ["inherit", "inherit", "inherit", "ipc"],
  })
    .on("message", (msg) => {
      if (msg === "restart") {
        child.kill();
        start();
        delete child;
      } else if (msg === "stop") {
        child.kill();
      }
    })
    .on("exit", (code) => {
      if (!(code == null)) {
        child.kill();
        start();
        delete child;
      }
    })
    .on("error", (err) => console.log(err));
})();
