const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../data/budget.json");

function readDB() {
  const raw = fs.readFileSync(filePath);
  return JSON.parse(raw);
}

function writeDB(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

module.exports = { readDB, writeDB };
