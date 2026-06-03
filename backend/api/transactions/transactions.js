const express = require("express");
const router = express.Router();
const { readDB, writeDB } = require("../../utils/jsonDB.js");
const { v4: uuid } = require("uuid");

/* ============================================================
   GET ALL TRANSACTIONS
============================================================ */
router.get("/", (req, res) => {
  const db = readDB();
  if (!db.transactions) db.transactions = [];
  res.json(db.transactions);
});

/* ============================================================
   CREATE TRANSACTION
============================================================ */
router.post("/", (req, res) => {
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
  res.json({ success: true, transaction: tx });
});


/* ============================================================
   UPDATE TRANSACTION
============================================================ */
router.put("/:id", (req, res) => {
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
  res.json({ success: true, transaction: updatedTx });
});

/* ============================================================
   DELETE TRANSACTION
============================================================ */
router.delete("/:id", (req, res) => {
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
  res.json({ success: true });
});

/* ============================================================
   APPLY TRANSACTION EFFECT TO BUDGET
============================================================ */
function applyTransactionEffect(db, tx, direction) {
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
}

module.exports = router;   // ⭐ REQUIRED
