const express = require("express");
const router = express.Router();
const requireAuth = require("../../middleware/requireAuth");
const envelopeRepo = require("../../db/envelopeRepository");

router.post("/", requireAuth, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { name, balance, emoji } = req.body;
    if (!name || balance == null) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const envelope = await envelopeRepo.createEnvelope(user_id, {
      name,
      balance: Number(balance),
      emoji
    });

    res.json({ success: true, envelope });
  } catch (err) {
    console.error("[budget/envelope] POST / error:", err);
    res.status(500).json({ error: "Server error creating envelope" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { id } = req.params;
    const { name, balance, emoji } = req.body;

    const updated = await envelopeRepo.updateEnvelope(user_id, id, {
      name,
      balance: balance != null ? Number(balance) : undefined,
      emoji
    });

    if (!updated) {
      return res.status(404).json({ error: "Envelope not found" });
    }

    res.json({ success: true, envelope: updated });
  } catch (err) {
    console.error("[budget/envelope] PUT /:id error:", err);
    res.status(500).json({ error: "Server error updating envelope" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { id } = req.params;

    await envelopeRepo.deleteEnvelope(user_id, id);
    res.json({ success: true });
  } catch (err) {
    console.error("[budget/envelope] DELETE /:id error:", err);
    res.status(500).json({ error: "Server error deleting envelope" });
  }
});

module.exports = router;
