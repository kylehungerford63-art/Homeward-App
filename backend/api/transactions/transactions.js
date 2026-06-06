const express = require("express");
const router = express.Router();
const requireAuth = require("../../middleware/requireAuth");
const txRepo = require("../../db/transactionRepository");
const categoryRepo = require("../../db/categoryRepository");
const envelopeRepo = require("../../db/envelopeRepository");

/* GET ALL TRANSACTIONS */
router.get("/", requireAuth, async (req, res) => {
  try {
    const user_id = req.user.id;
    const transactions = await txRepo.getTransactionsByUser(user_id);
    res.json(transactions);
  } catch (err) {
    console.error("[transactions] GET / error:", err);
    res.status(500).json({ error: "Server error reading transactions" });
  }
});

/* CREATE TRANSACTION */
router.post("/", requireAuth, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { date, name, amount, categoryId, envelopeId, ignored } = req.body;

    const tx = await txRepo.createTransaction(user_id, {
      date,
      name,
      amount: Number(amount),
      category_id: categoryId,
      envelope_id: envelopeId,
      ignored
    });

    // apply effects
    await applyTransactionEffect(user_id, tx, +1);

    res.json({ success: true, transaction: tx });
  } catch (err) {
    console.error("[transactions] POST / error:", err);
    res.status(500).json({ error: "Server error creating transaction" });
  }
});

/* UPDATE TRANSACTION */
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { id } = req.params;

    const oldTx = await txRepo.getTransactionById(user_id, id);
    if (!oldTx) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    if (!oldTx.ignored) {
      await applyTransactionEffect(user_id, oldTx, -1);
    }

    const { date, name, amount, categoryId, envelopeId, ignored } = req.body;

    const updatedTx = await txRepo.updateTransaction(user_id, id, {
      date,
      name,
      amount: Number(amount),
      category_id: categoryId,
      envelope_id: envelopeId,
      ignored
    });

    if (!updatedTx.ignored) {
      await applyTransactionEffect(user_id, updatedTx, +1);
    }

    res.json({ success: true, transaction: updatedTx });
  } catch (err) {
    console.error("[transactions] PUT /:id error:", err);
    res.status(500).json({ error: "Server error updating transaction" });
  }
});

/* DELETE TRANSACTION */
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { id } = req.params;

    const tx = await txRepo.getTransactionById(user_id, id);
    if (!tx) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    await applyTransactionEffect(user_id, tx, -1);
    await txRepo.deleteTransaction(user_id, id);

    res.json({ success: true });
  } catch (err) {
    console.error("[transactions] DELETE /:id error:", err);
    res.status(500).json({ error: "Server error deleting transaction" });
  }
});

/* APPLY EFFECTS TO CATEGORIES/ENVELOPES */
async function applyTransactionEffect(user_id, tx, direction) {
  try {
    if (tx.ignored) return;

    const amount = Number(tx.amount) * direction;

    if (tx.category_id) {
      const categories = await categoryRepo.getCategoriesByUser(user_id);
      const cat = categories.find(c => String(c.id) === String(tx.category_id));
      if (cat) {
        const newSpent = Math.max(0, Number(cat.spent || 0) + amount);
        await categoryRepo.updateCategory(user_id, cat.id, {
          spent: newSpent
        });
      }
      return;
    }

    if (tx.envelope_id) {
      const envelopes = await envelopeRepo.getEnvelopesByUser(user_id);
      const env = envelopes.find(e => String(e.id) === String(tx.envelope_id));
      if (env) {
        const newBalance = Number(env.balance || 0) - amount;
        await envelopeRepo.updateEnvelope(user_id, env.id, {
          balance: newBalance
        });
      }
    }
  } catch (err) {
    console.error("[transactions] applyTransactionEffect error:", err);
  }
}

module.exports = router;
