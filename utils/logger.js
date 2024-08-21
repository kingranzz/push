module.exports = (type, event, message) => {
  const dateTime = require("./getDateTime")();
  let color;
  switch (type.toLowerCase()) {
    case "primary":
      color = "4";
      break;
    case "success":
      color = "2";
      break;
    case "info":
      color = "6";
      break;
    case "warning":
      color = "3";
      break;
    case "error":
      color = "1";
      break;
    default:
      color = "5";
      break;
  }
  console.log(
    `\n\x1b[1m\x1b[4${color}m\x20ϟ\x20${global.name}\x20ヅ\x20\x1b[0m\x20\x20${dateTime}\n\x1b[1m\x1b[4${color}m\x20${event}\x20\x1b[0m\n\x1b[1m\x20Message:\x1b[0m\x20${message}`
  );
};
