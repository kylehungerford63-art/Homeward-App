const express = require("express");
const router = express.Router();
const requireAuth = require("../../middleware/requireAuth");
const categoryRepo = require("../../db/categoryRepository");

router.post("/", requireAuth, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { name, limit, emoji } = req.body;
    if (!name || limit == null) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const category = await categoryRepo.createCategory(user_id, {
      name,
      limit_amount: Number(limit),
      emoji
    });

    res.json({ success: true, category });
  } catch (err) {
    console.error("[budget/category] POST / error:", err);
    res.status(500).json({ error: "Server error creating category" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { id } = req.params;
    const { name, limit, emoji } = req.body;

    const updated = await categoryRepo.updateCategory(user_id, id, {
      name,
      limit_amount: limit != null ? Number(limit) : undefined,
      emoji
    });

    if (!updated) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json({ success: true, category: updated });
  } catch (err) {
    console.error("[budget/category] PUT /:id error:", err);
    res.status(500).json({ error: "Server error updating category" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { id } = req.params;

    await categoryRepo.deleteCategory(user_id, id);
    res.json({ success: true });
  } catch (err) {
    console.error("[budget/category] DELETE /:id error:", err);
    res.status(500).json({ error: "Server error deleting category" });
  }
});

module.exports = router;
