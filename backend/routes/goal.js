const express = require("express");
const router = express.Router();
const goalRepo = require("../db/goalRepository");
const profileRepo = require("../db/profileRepository");
const { calculateHouseGoalProgress } = require("../engine/houseGoalEngine");

// Helper: safe number conversion
function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// GET /api/goal/load
router.get("/load", async (req, res) => {
  try {
    const user_id = req.user && req.user.id;
    if (!user_id) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const profile = await profileRepo.getProfileByUserId(user_id);
    if (!profile) {
      return res.json({ success: true, found: false, goal: null });
    }

    if (!profile.house_goal_id) {
      return res.json({ success: true, found: false, goal: null });
    }

    const goal = await goalRepo.getGoalById(profile.house_goal_id);
    return res.json({ success: true, found: !!goal, goal: goal || null });
  } catch (err) {
    console.error("[GET /api/goal/load] error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/goal/save
router.post("/save", async (req, res) => {
  try {
    const user_id = req.user && req.user.id;
    if (!user_id) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const payload = req.body || {};

    let profile = await profileRepo.getProfileByUserId(user_id);
    if (!profile) {
      return res.status(404).json({ success: false, error: "Profile not found" });
    }

    // Normalize payload fields
    const normalized = {
      house_price: toNumber(payload.house_price, 0),
      current_balance: toNumber(payload.current_balance, 0),
      monthly_contribution: toNumber(payload.monthly_contribution, 0),
      target_date: payload.target_date || null,
      down_payment_percent: toNumber(payload.down_payment_percent, 0),
      closing_cost_percent: toNumber(payload.closing_cost_percent, 0),
      moving_cost_fixed: toNumber(payload.moving_cost_fixed, 0),
      extra_savings_target: toNumber(payload.extra_savings_target, 0),
      buckets: payload.buckets || {}
    };

    let goal;

    // If user has no goal, create one and attach it to the profile
    if (!profile.house_goal_id) {
      // create goal (include user_id if your repo supports it)
      const createPayload = { ...normalized, user_id };
      goal = await goalRepo.createGoal(createPayload);

      // Attach by user_id (profileRepo.updateProfile expects user_id)
      try {
        await profileRepo.updateProfile(user_id, { house_goal_id: goal.id });
      } catch (attachErr) {
        console.error("[POST /api/goal/save] failed to attach goal to profile:", attachErr);
        // Return success for goal creation but warn caller
        return res.json({ success: true, saved: true, goal, warning: "Goal saved but profile not updated" });
      }
    } else {
      // Update existing goal
      goal = await goalRepo.updateGoal(profile.house_goal_id, normalized);
    }

    return res.json({ success: true, saved: true, goal });
  } catch (err) {
    console.error("[POST /api/goal/save] error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// POST /api/goal/full
router.post("/full", async (req, res) => {
  try {
    const payload = req.body || {};

    if (
      payload.house_price === undefined ||
      payload.current_balance === undefined ||
      payload.monthly_contribution === undefined ||
      !payload.target_date
    ) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const result = calculateHouseGoalProgress({
      current_balance: toNumber(payload.current_balance, 0),
      target_amount: toNumber(payload.house_price, 0),
      target_date: payload.target_date,
      monthly_contribution: toNumber(payload.monthly_contribution, 0)
    });

    return res.json({ success: true, ...result });
  } catch (err) {
    console.error("[POST /api/goal/full] error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

module.exports = router;
