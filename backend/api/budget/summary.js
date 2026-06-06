const express = require("express");
const router = express.Router();
const { readDB } = require("../../utils/jsonDB.js");

router.get("/", (req, res) => {
  try {
    const db = readDB();

    const page = {
      mode: db.mode || "simple",
      month: new Date().toISOString().slice(0, 7),
      categories: db.categories || [],
      envelopes: db.envelopes || []
    };

    return res.json(page);
  } catch (err) {
    console.error("[budget/summary] GET / error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ error: "Server error reading budget summary" });
  }
});

module.exports = router;
