const express = require("express");
const router = express.Router();
const { readDB, writeDB } = require("../../utils/jsonDB.js");
const { v4: uuid } = require("uuid");

/* ============================================================
   GET ALL TRANSACTIONS (with category/envelope emoji)
============================================================ */
router.get("/", (req, res) => {
  try {
    const db = readDB();
    if (!db.transactions) db.transactions = [];
    if (!db.categories) db.categories = [];
    if (!db.envelopes) db.envelopes = [];

    // Build emoji lookup maps
    const categoryEmojiMap = {};
    const envelopeEmojiMap = {};

    db.categories.forEach(c => {
      categoryEmojiMap[c.id] = c.emoji || null;
    });

    db.envelopes.forEach(e => {
      envelopeEmojiMap[e.id] = e.emoji || null;
    });

    // Attach emoji to each transaction
    const enriched = db.transactions.map(tx => ({
      ...tx,
      categoryEmoji: tx.categoryId ? categoryEmojiMap[tx.categoryId] : null,
      envelopeEmoji: tx.envelopeId ? envelopeEmojiMap[tx.envelopeId] : null
    }));

    return res.json(enriched);

  } catch (err) {
    console.error("[transactions] GET / error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ error: "Server error reading transactions" });
  }
});

/* ============================================================
   CREATE TRANSACTION
============================================================ */
router.post("/", (req, res) => {
  try {
    const db = readDB();
    if (!db.transactions) db.transactions = [];

    const { date, name, amount, categoryId, envelopeId, ignored } = req.body;

    const tx = {
      id: uuid(),
      date,
      name,
      amount: Number(amount),
      categoryId: categoryId || null,
      envelopeId: envelopeId || null,
      ignored: !!ignored
    };

    db.transactions.push(tx);

    if (!tx.ignored) {
      applyTransactionEffect(db, tx, +1);
    }

    writeDB(db);
    return res.json({ success: true, transaction: tx });
  } catch (err) {
    console.error("[transactions] POST / error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ error: "Server error creating transaction" });
  }
});

/* ============================================================
   UPDATE TRANSACTION
============================================================ */
router.put("/:id", (req, res) => {
  try {
    const db = readDB();
    if (!db.transactions) db.transactions = [];

    const id = req.params.id;
    const txIndex = db.transactions.findIndex(t => t.id === id);

    if (txIndex === -1) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    const oldTx = db.transactions[txIndex];

    // Reverse old effect only if it counted
    if (!oldTx.ignored) {
      applyTransactionEffect(db, oldTx, -1);
    }

    const { date, name, amount, categoryId, envelopeId, ignored } = req.body;

    const updatedTx = {
      ...oldTx,
      date,
      name,
      amount: Number(amount),
      categoryId: categoryId || null,
      envelopeId: envelopeId || null,
      ignored: ignored !== undefined ? !!ignored : oldTx.ignored
    };

    db.transactions[txIndex] = updatedTx;

    // Apply new effect only if not ignored
    if (!updatedTx.ignored) {
      applyTransactionEffect(db, updatedTx, +1);
    }

    writeDB(db);
    return res.json({ success: true, transaction: updatedTx });
  } catch (err) {
    console.error("[transactions] PUT /:id error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ error: "Server error updating transaction" });
  }
});

/* ============================================================
   DELETE TRANSACTION
============================================================ */
router.delete("/:id", (req, res) => {
  try {
    const db = readDB();
    if (!db.transactions) db.transactions = [];

    const id = req.params.id;
    const txIndex = db.transactions.findIndex(t => t.id === id);

    if (txIndex === -1) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    const tx = db.transactions[txIndex];

    // Reverse effect
    applyTransactionEffect(db, tx, -1);

    db.transactions.splice(txIndex, 1);

    writeDB(db);
    return res.json({ success: true });
  } catch (err) {
    console.error("[transactions] DELETE /:id error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ error: "Server error deleting transaction" });
  }
});

/* ============================================================
   APPLY TRANSACTION EFFECT TO BUDGET
============================================================ */
function applyTransactionEffect(db, tx, direction) {
  try {
    if (tx.ignored) return;

    const amount = Number(tx.amount) * direction;

    if (tx.categoryId) {
      const cat = db.categories?.find(c => String(c.id) === String(tx.categoryId));
      if (cat) {
        cat.spent = Number(cat.spent || 0) + amount;
        if (cat.spent < 0) cat.spent = 0;
      }
      return;
    }

    if (tx.envelopeId) {
      const env = db.envelopes?.find(e => String(e.id) === String(tx.envelopeId));
      if (env) {
        env.balance = Number(env.balance || 0) - amount;
      }
    }
  } catch (err) {
    console.error("[transactions] applyTransactionEffect error:", err && err.stack ? err.stack : err);
    // swallow — we don't want this to crash the route; caller will writeDB and return
  }
}

module.exports = router;
