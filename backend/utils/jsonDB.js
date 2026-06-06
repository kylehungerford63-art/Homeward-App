// backend/utils/jsonDB.js
const fs = require("fs");
const path = require("path");
const os = require("os");

const SOURCE_DB_PATH = path.join(__dirname, "../data/budget.json"); // committed file
const LOCAL_RUNTIME = path.join(__dirname, "../data/budget.runtime.json");
const OS_TMP_RUNTIME = path.join(os.tmpdir(), "budget.json");

// Allow overriding runtime path via env var for special environments
const ENV_RUNTIME = process.env.BUDGET_RUNTIME_PATH || null;

// Order of preference for runtime DB path
const RUNTIME_CANDIDATES = [
  ENV_RUNTIME,
  LOCAL_RUNTIME,
  OS_TMP_RUNTIME
].filter(Boolean);

/**
 * Try to find a runtime path that is usable (exists and valid JSON),
 * or create one by copying the committed source or creating a default DB.
 */
function chooseRuntimePath() {
  for (const p of RUNTIME_CANDIDATES) {
    try {
      // If file exists and parses, use it
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, "utf8");
        try {
          JSON.parse(raw);
          return p;
        } catch (err) {
          // invalid JSON — we'll attempt to recreate below
          console.warn("[jsonDB] candidate exists but invalid JSON:", p);
        }
      } else {
        // If file doesn't exist, we can create it here (if parent dir writable)
        try {
          const dir = path.dirname(p);
          if (!fs.existsSync(dir)) {
            // try to create parent dir (only for local runtime)
            fs.mkdirSync(dir, { recursive: true });
          }
          // We'll create it below by copying or default
          return p;
        } catch (err) {
          // cannot create this candidate, try next
          console.warn("[jsonDB] cannot prepare candidate path:", p, err && err.message);
        }
      }
    } catch (err) {
      console.warn("[jsonDB] error checking candidate path:", p, err && err.message);
    }
  }
  // As a last resort, use the local runtime path (may throw later)
  return LOCAL_RUNTIME;
}

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function ensureRuntimeDB() {
  const runtimePath = chooseRuntimePath();

  try {
    // If runtime exists and is valid, keep it
    if (fs.existsSync(runtimePath)) {
      const raw = fs.readFileSync(runtimePath, "utf8");
      if (safeParse(raw) !== null) {
        // good runtime found
        return runtimePath;
      }
      console.warn("[jsonDB] runtime exists but invalid JSON; will recreate:", runtimePath);
    }

    // If committed source exists and parses, copy it to runtime
    if (fs.existsSync(SOURCE_DB_PATH)) {
      const raw = fs.readFileSync(SOURCE_DB_PATH, "utf8");
      const parsed = safeParse(raw);
      if (parsed !== null) {
        fs.writeFileSync(runtimePath, JSON.stringify(parsed, null, 2), "utf8");
        console.log("[jsonDB] copied committed DB to runtime:", runtimePath);
        return runtimePath;
      } else {
        console.warn("[jsonDB] committed DB exists but is invalid JSON; will create default runtime DB.");
      }
    } else {
      console.warn("[jsonDB] committed DB not found at", SOURCE_DB_PATH);
    }

    // Otherwise create a minimal default DB
    const defaultDB = {
      categories: [],
      envelopes: [],
      transactions: [],
      mode: "simple"
    };
    fs.writeFileSync(runtimePath, JSON.stringify(defaultDB, null, 2), "utf8");
    console.log("[jsonDB] created default runtime DB at", runtimePath);
    return runtimePath;
  } catch (err) {
    // If we failed to create the chosen runtime, try fallback local runtime
    console.error("[jsonDB] ensureRuntimeDB error for", runtimePath, err && err.stack ? err.stack : err);
    if (runtimePath !== LOCAL_RUNTIME) {
      try {
        fs.writeFileSync(LOCAL_RUNTIME, JSON.stringify({
          categories: [], envelopes: [], transactions: [], mode: "simple"
        }, null, 2), "utf8");
        console.log("[jsonDB] created fallback local runtime DB at", LOCAL_RUNTIME);
        return LOCAL_RUNTIME;
      } catch (err2) {
        console.error("[jsonDB] fallback create failed:", err2 && err2.stack ? err2.stack : err2);
      }
    }
    // If everything fails, throw so caller can handle (routes will catch)
    throw err;
  }
}

function readDB() {
  try {
    const runtimePath = ensureRuntimeDB();
    const raw = fs.readFileSync(runtimePath, "utf8");
    const parsed = safeParse(raw);
    if (parsed === null) {
      console.warn("[jsonDB] runtime JSON invalid, returning safe default");
      return { categories: [], envelopes: [], transactions: [], mode: "simple" };
    }
    return parsed;
  } catch (err) {
    console.error("[jsonDB] readDB error:", err && err.stack ? err.stack : err);
    return { categories: [], envelopes: [], transactions: [], mode: "simple" };
  }
}

function writeDB(data) {
  try {
    const runtimePath = ensureRuntimeDB();
    fs.writeFileSync(runtimePath, JSON.stringify(data, null, 2), "utf8");
    console.log("[jsonDB] wrote runtime DB to", runtimePath);
  } catch (err) {
    console.error("[jsonDB] writeDB error:", err && err.stack ? err.stack : err);
    throw err;
  }
}

module.exports = { readDB, writeDB };
