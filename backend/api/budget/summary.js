const express = require("express");
const router = express.Router();
const requireAuth = require("../../middleware/requireAuth");
const budgetModeRepo = require("../../db/budgetModeRepository");
const categoryRepo = require("../../db/categoryRepository");
const envelopeRepo = require("../../db/envelopeRepository");

router.get("/", requireAuth, async (req, res) => {
  try {
    const user_id = req.user.id;

    const mode = await budgetModeRepo.getMode(user_id);
    const categories = await categoryRepo.getCategoriesByUser(user_id);
    const envelopes = await envelopeRepo.getEnvelopesByUser(user_id);

    const page = {
      mode,
      month: new Date().toISOString().slice(0, 7),
      categories,
      envelopes
    };

    res.json(page);
  } catch (err) {
    console.error("[budget/summary] GET / error:", err);
    res.status(500).json({ error: "Server error reading budget summary" });
  }
});

module.exports = router;
