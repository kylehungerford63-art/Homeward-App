const express = require("express");
const router = express.Router();
const requireAuth = require("../../middleware/requireAuth");

const budgetModeRepo = require("../../db/budgetModeRepository");
const categoryRepo = require("../../db/categoryRepository");
const envelopeRepo = require("../../db/envelopeRepository");
const transactionRepo = require("../../db/transactionRepository");

router.get("/", requireAuth, async (req, res) => {
  try {
    const user_id = req.user.id;

    // Current month boundaries
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const mode = await budgetModeRepo.getMode(user_id);
    const categories = await categoryRepo.getCategoriesByUser(user_id);
    const envelopes = await envelopeRepo.getEnvelopesByUser(user_id);

    // Fetch all transactions for this user in this month
    const tx = await transactionRepo.getTransactionsByUserAndDateRange(
      user_id,
      monthStart.toISOString(),
      monthEnd.toISOString()
    );

    // Build spent totals
    const spentByCategory = {};
    const spentByEnvelope = {};

    tx.forEach(t => {
      if (t.ignored) return;

      const amt = Number(t.amount || 0);

      if (t.category_id) {
        spentByCategory[t.category_id] =
          (spentByCategory[t.category_id] || 0) + amt;
      }

      if (t.envelope_id) {
        spentByEnvelope[t.envelope_id] =
          (spentByEnvelope[t.envelope_id] || 0) + amt;
      }
    });

    // Attach spent totals to categories
    const categoriesWithSpent = categories.map(c => ({
      ...c,
      spent: spentByCategory[c.id] || 0
    }));

    // Attach spent totals to envelopes
    const envelopesWithSpent = envelopes.map(e => ({
      ...e,
      spent: spentByEnvelope[e.id] || 0
    }));

    res.json({
      mode,
      month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      categories: categoriesWithSpent,
      envelopes: envelopesWithSpent
    });

  } catch (err) {
    console.error("[budget/summary] GET / error:", err);
    res.status(500).json({ error: "Server error reading budget summary" });
  }
});

module.exports = router;
