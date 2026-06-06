const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { readDB, writeDB } = require("../../utils/jsonDB.js");

const router = express.Router();

// Normalize IDs for old DB entries
function normalize(db) {
  if (!db.envelopes) db.envelopes = [];

  let changed = false;
  db.envelopes = db.envelopes.map(e => {
    if (!e.id) changed = true;
    return {
      id: e.id || uuidv4(),
      name: e.name,
      balance: Number(e.balance || 0),
      emoji: e.emoji || ""
    };
  });

  return { db, changed };
}

function getEnvelopes() {
  let db = readDB();
  const normalized = normalize(db);
  if (normalized.changed) {
    writeDB(normalized.db);
  }
  return normalized.db.envelopes;
}

// CREATE
router.post("/", (req, res) => {
  try {
    const { name, balance, emoji } = req.body;
    if (!name || balance == null) return res.status(400).json({ error: "Missing fields" });

    let db = readDB();
    const normalized = normalize(db);
    db = normalized.db;

    const envelope = {
      id: uuidv4(),
      emoji: emoji || "",
      name,
      balance: Number(balance)
    };

    db.envelopes.push(envelope);
    writeDB(db);

    return res.json({ success: true, envelope });
  } catch (err) {
    console.error("[budget/envelope] POST / error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ error: "Server error creating envelope" });
  }
});

// UPDATE
router.put("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { name, balance, emoji } = req.body;

    let db = readDB();
    const normalized = normalize(db);
    db = normalized.db;
    if (normalized.changed) writeDB(db);

    const idx = db.envelopes.findIndex(e => e.id === id);
    if (idx === -1) return res.status(404).json({ error: "Envelope not found" });

    if (name !== undefined) db.envelopes[idx].name = name;
    if (balance !== undefined) db.envelopes[idx].balance = Number(balance);
    if (emoji !== undefined) db.envelopes[idx].emoji = emoji;

    writeDB(db);
    return res.json({ success: true, envelope: db.envelopes[idx] });
  } catch (err) {
    console.error("[budget/envelope] PUT /:id error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ error: "Server error updating envelope" });
  }
});

// DELETE
router.delete("/:id", (req, res) => {
  try {
    const { id } = req.params;

    let db = readDB();
    const normalized = normalize(db);
    db = normalized.db;
    if (normalized.changed) writeDB(db);

    const idx = db.envelopes.findIndex(e => e.id === id);
    if (idx === -1) return res.status(404).json({ error: "Envelope not found" });

    db.envelopes.splice(idx, 1);
    writeDB(db);

    return res.json({ success: true });
  } catch (err) {
    console.error("[budget/envelope] DELETE /:id error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ error: "Server error deleting envelope" });
  }
});

module.exports = { router, getEnvelopes };
