const express = require("express");
const router = express.Router();
const goalRepo = require("../db/goalRepository");
const profileRepo = require("../db/profileRepository");
const { calculateHouseGoalProgress } = require("../engine/houseGoalEngine");

// GET /api/goal/load
router.get("/load", async (req, res) => {
  const user_id = req.user.id;

  const profile = await profileRepo.getProfileByUserId(user_id);
  if (!profile || !profile.house_goal_id) {
    return res.json({ success: true, found: false, goal: null });
  }

  const goal = await goalRepo.getGoalById(profile.house_goal_id);
  res.json({ success: true, found: !!goal, goal });
});

// POST /api/goal/save
router.post("/save", async (req, res) => {
  const user_id = req.user.id;
  const payload = req.body;

  let profile = await profileRepo.getProfileByUserId(user_id);
  if (!profile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  let goal;

  // If user has no goal, create one
  if (!profile.house_goal_id) {
    goal = await goalRepo.createGoal({
      house_price: payload.house_price,
      current_balance: payload.current_balance,
      monthly_contribution: payload.monthly_contribution,
      target_date: payload.target_date,
      down_payment_percent: payload.down_payment_percent,
      closing_cost_percent: payload.closing_cost_percent,
      moving_cost_fixed: payload.moving_cost_fixed,
      extra_savings_target: payload.extra_savings_target,
      buckets: payload.buckets || {}
    });

    // Attach goal to profile
    await profileRepo.updateProfile(user_id, {
      house_goal_id: goal.id
    });
  } else {
    // Update existing goal
    goal = await goalRepo.updateGoal(profile.house_goal_id, {
      house_price: payload.house_price,
      current_balance: payload.current_balance,
      monthly_contribution: payload.monthly_contribution,
      target_date: payload.target_date,
      down_payment_percent: payload.down_payment_percent,
      closing_cost_percent: payload.closing_cost_percent,
      moving_cost_fixed: payload.moving_cost_fixed,
      extra_savings_target: payload.extra_savings_target,
      buckets: payload.buckets || {}
    });
  }

  res.json({ success: true, saved: true, goal });
});

// POST /api/goal/full
router.post("/full", async (req, res) => {
  const payload = req.body;

  if (!payload.house_price || !payload.current_balance || !payload.monthly_contribution || !payload.target_date) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const result = calculateHouseGoalProgress({
    current_balance: payload.current_balance,
    target_amount: payload.house_price,
    target_date: payload.target_date,
    monthly_contribution: payload.monthly_contribution
  });

  res.json({ success: true, ...result });
});

module.exports = router;
