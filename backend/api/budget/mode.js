const express = require("express");
const router = express.Router();
const requireAuth = require("../../middleware/requireAuth");
const budgetModeRepo = require("../../db/budgetModeRepository");

router.get("/", requireAuth, async (req, res) => {
  try {
    const user_id = req.user.id;
    const mode = await budgetModeRepo.getMode(user_id);
    res.json({ mode });
  } catch (err) {
    console.error("[budget/mode] GET / error:", err);
    res.status(500).json({ error: "Server error reading mode" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { mode } = req.body;

    if (!["simple", "envelope"].includes(mode)) {
      return res.status(400).json({ error: "Invalid mode" });
    }

    const savedMode = await budgetModeRepo.setMode(user_id, mode);
    res.json({ success: true, mode: savedMode });
  } catch (err) {
    console.error("[budget/mode] POST / error:", err);
    res.status(500).json({ error: "Server error setting mode" });
  }
});

module.exports = router;
