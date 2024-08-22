const fs = require("fs");

function logMessageAsJSON(message, filePath) {
  let jsonArray = [];
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, "utf8");
    if (data.trim()) {
      jsonArray = JSON.parse(data);
    }
  }
  jsonArray.push(message);
  fs.writeFileSync(filePath, JSON.stringify(jsonArray, null, 2), "utf8");
}

module.exports = {
  logMessageAsJSON,
};
