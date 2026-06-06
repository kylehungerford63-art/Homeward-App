// backend/utils/jsonDB.js
const fs = require("fs");
const path = require("path");

// ------------------------------------------------------------
//  CONFIG: Store DB inside project folder (portable + persistent)
// ------------------------------------------------------------
const PROJECT_ROOT = path.join(__dirname, "../../");
const LOCAL_DATA_DIR = path.join(PROJECT_ROOT, "local-data");

// MAIN DB FILE (your real data)
const DB_FILE = path.join(LOCAL_DATA_DIR, "budget.runtime.json");

// OPTIONAL goals file (merge into DB)
const GOAL_FILE = path.join(LOCAL_DATA_DIR, "goal.json");

// Default structure
const DEFAULT_DB = {
  categories: [],
  envelopes: [],
  transactions: [],
  mode: "simple",
  goals: {}
};

// ------------------------------------------------------------
//  Ensure local-data folder + DB file exist
// ------------------------------------------------------------
function ensureLocalData() {
  if (!fs.existsSync(LOCAL_DATA_DIR)) {
    fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
    console.log("[jsonDB] Created local-data folder");
  }

  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), "utf8");
    console.log("[jsonDB] Created new runtime DB file:", DB_FILE);
  }
}

// ------------------------------------------------------------
//  Safe JSON parse
// ------------------------------------------------------------
function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ------------------------------------------------------------
//  READ DB
// ------------------------------------------------------------
function readDB() {
  ensureLocalData();

  let db = DEFAULT_DB;

  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    const parsed = safeParse(raw);
    if (parsed) db = parsed;
  } catch (err) {
    console.error("[jsonDB] readDB error:", err);
  }

  // Merge goals.json if present
  if (fs.existsSync(GOAL_FILE)) {
    try {
      const goalRaw = fs.readFileSync(GOAL_FILE, "utf8");
      const goalParsed = safeParse(goalRaw);
      if (goalParsed) db.goals = goalParsed;
    } catch (err) {
      console.error("[jsonDB] Failed to read goal.json:", err);
    }
  }

  return db;
}

// ------------------------------------------------------------
//  WRITE DB
// ------------------------------------------------------------
function writeDB(data) {
  ensureLocalData();

  // Extract goals into separate file
  const { goals, ...rest } = data;

  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(rest, null, 2), "utf8");
    fs.writeFileSync(GOAL_FILE, JSON.stringify(goals || {}, null, 2), "utf8");
    console.log("[jsonDB] DB saved:", DB_FILE);
  } catch (err) {
    console.error("[jsonDB] writeDB error:", err);
    throw err;
  }
}

module.exports = { readDB, writeDB };
