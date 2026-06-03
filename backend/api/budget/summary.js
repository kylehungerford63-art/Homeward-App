const express = require("express");
const router = express.Router();
const { readDB } = require("../../utils/jsonDB.js");

router.get("/", (req, res) => {
  const db = readDB();

  const page = {
    mode: db.mode || "simple",
    month: new Date().toISOString().slice(0, 7),
    categories: db.categories || [],
    envelopes: db.envelopes || []
  };

  res.json(page);
});

module.exports = router;
