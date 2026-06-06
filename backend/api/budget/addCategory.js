const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { readDB, writeDB } = require("../../utils/jsonDB.js");

const router = express.Router();

// Normalize IDs for old DB entries
function normalize(db) {
  if (!db.categories) db.categories = [];

  let changed = false;
  db.categories = db.categories.map(c => {
    if (!c.id) changed = true;
    return {
      id: c.id || uuidv4(),
      name: c.name,
      limit: Number(c.limit || 0),
      spent: Number(c.spent || 0),
      emoji: c.emoji || ""
    };
  });

  return { db, changed };
}

function getCategories() {
  let db = readDB();
  const normalized = normalize(db);
  if (normalized.changed) {
    writeDB(normalized.db);
  }
  return normalized.db.categories;
}

// CREATE
router.post("/", (req, res) => {
  try {
    const { name, limit, emoji } = req.body;
    if (!name || limit == null) return res.status(400).json({ error: "Missing fields" });

    let db = readDB();
    const normalized = normalize(db);
    db = normalized.db;

    const category = {
      id: uuidv4(),
      emoji: emoji || "",
      name,
      limit: Number(limit),
      spent: 0
    };

    db.categories.push(category);
    writeDB(db);

    return res.json({ success: true, category });
  } catch (err) {
    console.error("[budget/category] POST / error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ error: "Server error creating category" });
  }
});

// UPDATE
router.put("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { name, limit, emoji } = req.body;

    let db = readDB();
    const normalized = normalize(db);
    db = normalized.db;
    if (normalized.changed) writeDB(db);

    const idx = db.categories.findIndex(c => c.id === id);
    if (idx === -1) return res.status(404).json({ error: "Category not found" });

    if (name !== undefined) db.categories[idx].name = name;
    if (limit !== undefined) db.categories[idx].limit = Number(limit);
    if (emoji !== undefined) db.categories[idx].emoji = emoji;

    writeDB(db);
    return res.json({ success: true, category: db.categories[idx] });
  } catch (err) {
    console.error("[budget/category] PUT /:id error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ error: "Server error updating category" });
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

    const idx = db.categories.findIndex(c => c.id === id);
    if (idx === -1) return res.status(404).json({ error: "Category not found" });

    db.categories.splice(idx, 1);
    writeDB(db);

    return res.json({ success: true });
  } catch (err) {
    console.error("[budget/category] DELETE /:id error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ error: "Server error deleting category" });
  }
});

module.exports = { router, getCategories };
