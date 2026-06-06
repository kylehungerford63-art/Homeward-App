const express = require("express");
const router = express.Router();
const { readDB, writeDB } = require("../../utils/jsonDB.js");

/* GET MODE */
router.get("/", (req, res) => {
  try {
    const db = readDB();
    return res.json({ mode: db.mode || "simple" });
  } catch (err) {
    console.error("[budget/mode] GET / error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ error: "Server error reading mode" });
  }
});

/* SET MODE */
router.post("/", (req, res) => {
  try {
    const db = readDB();
    const { mode } = req.body;

    if (!["simple", "envelope"].includes(mode)) {
      return res.status(400).json({ error: "Invalid mode" });
    }

    db.mode = mode;
    writeDB(db);

    return res.json({ success: true, mode });
  } catch (err) {
    console.error("[budget/mode] POST / error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ error: "Server error setting mode" });
  }
});

module.exports = router;
