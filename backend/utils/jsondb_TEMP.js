const fs = require("fs");
const path = require("path");

// Path to the committed DB file (read-only on Render)
const SOURCE_DB_PATH = path.join(__dirname, "../data/budget.json");

// Writable path for Render
const RUNTIME_DB_PATH = "/tmp/budget.json";

// Ensure runtime DB exists
function ensureRuntimeDB() {
  if (!fs.existsSync(RUNTIME_DB_PATH)) {
    // Copy the committed DB into /tmp
    const raw = fs.readFileSync(SOURCE_DB_PATH);
    fs.writeFileSync(RUNTIME_DB_PATH, raw);
  }
}

function readDB() {
  ensureRuntimeDB();
  const raw = fs.readFileSync(RUNTIME_DB_PATH);
  return JSON.parse(raw);
}

function writeDB(data) {
  ensureRuntimeDB();
  fs.writeFileSync(RUNTIME_DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = { readDB, writeDB };
///push///