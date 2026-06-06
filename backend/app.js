// backend/app.js
// Express app bootstrap with JSON parsing, safe router loader, static frontend, and error handling.

console.log("ðŸ”¥ USING THIS APP.JS");
const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();

// Serve icons folder at /icons
app.use('/icons', express.static(path.join(__dirname, '..', 'icons')));


// Core middleware
app.use(cors());
app.use(express.json()); // parse JSON bodies

// Catch JSON parse errors from express.json() and return 400 instead of 500
app.use((err, req, res, next) => {
  if (err && err.type === "entity.parse.failed") {
    console.warn("[WARN] Malformed JSON body:", err.message);
    return res.status(400).json({ error: "Invalid JSON body" });
  }
  next(err);
});

/* ===== Request logger for debugging API routing ===== */
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.path}`);
  next();
});
/* =================================================== */

// --- Safe router loader: require modules and accept either module or module.router ---
function loadRouter(path) {
  try {
    const mod = require(path);
    const r = mod && (mod.router || mod.default || mod);
    if (typeof r === "function") return r;
    console.warn(`[WARN] Router at ${path} did not export a function; skipping mount.`);
    return null;
  } catch (err) {
    console.error(`[ERROR] Failed to load router ${path}:`, err && err.stack ? err.stack : err);
    return null;
  }
}

// Budget API routers
const modeRouter = loadRouter("./api/budget/mode.js");
const summaryRouter = loadRouter("./api/budget/summary.js");
const categoryRouter = loadRouter("./api/budget/addCategory.js");
const envelopeRouter = loadRouter("./api/budget/addEnvelope.js");

// Buckets + Goal routers
const bucketsRouter = loadRouter("./routes/buckets.js");
const goalRouter = loadRouter("./routes/goal.js");

// Transactions
const transactionsRouter = loadRouter("./api/transactions/transactions.js");

// Mount routers only when valid
if (modeRouter) app.use("/api/budget/mode", modeRouter);
if (summaryRouter) app.use("/api/budget/summary", summaryRouter);
if (categoryRouter) app.use("/api/budget/category", categoryRouter);
if (envelopeRouter) app.use("/api/budget/envelope", envelopeRouter);

if (bucketsRouter) app.use("/api/buckets", bucketsRouter);
if (goalRouter) app.use("/api/goal", goalRouter);
if (transactionsRouter) app.use("/api/transactions", transactionsRouter);

/* ============================================
   1b. API 404 handler (catch unmatched API routes)
============================================ */
app.use("/api", (req, res) => {
  res.status(404).json({ error: "API route not found", path: req.path });
});

/* ============================================
   2. STATIC FRONTEND (SERVE FRONTEND FILES)
============================================ */
app.use(express.static(path.join(__dirname, "../frontend")));

/* ============================================
   3. API ERROR HANDLER
============================================ */
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err && err.stack ? err.stack : err);
  if (req.path && req.path.startsWith("/api")) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
  next(err);
});

/* ============================================
   4. FALLBACK â€” serve index.html for client routing (GET only)
============================================ */
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

module.exports = app;


