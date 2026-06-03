const express = require("express");
const router = express.Router();
const { readDB, writeDB } = require("../../utils/jsonDB.js");

/* GET MODE */
router.get("/", (req, res) => {
  const db = readDB();
  res.json({ mode: db.mode || "simple" });
});

/* SET MODE */
router.post("/", (req, res) => {
  const db = readDB();
  const { mode } = req.body;

  if (!["simple", "envelope"].includes(mode)) {
    return res.status(400).json({ error: "Invalid mode" });
  }

  db.mode = mode;
  writeDB(db);

  res.json({ success: true, mode });
});

module.exports = router;
