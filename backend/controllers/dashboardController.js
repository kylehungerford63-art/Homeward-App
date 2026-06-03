const profileRepo = require('../db/profileRepository');
const accountRepo = require('../db/accountRepository'); // we will create this mock next
const goalRepo = require('../db/goalRepository');       // also created next
const { calculateHouseGoalProgress } = require('../engine/houseGoalEngine');

exports.getDashboard = async (req, res) => {
  const user_id = req.user.id;

  // 1. Load profile
  const profile = await profileRepo.getProfileByUserId(user_id);
  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  // 2. Load house goal
  const goal = await goalRepo.getGoalById(profile.house_goal_id);

  // 3. Load selected savings account
  const account = await accountRepo.getAccountById(
    profile.selected_house_savings_account_id
  );

  // 4. Run bucket engine
  const progress = calculateHouseGoalProgress({
    current_balance: account?.balance || 0,
    target_amount: goal?.target_amount || 0,
    target_date: goal?.target_date || null,
    monthly_contribution: goal?.monthly_contribution || null
  });

  // 5. Return dashboard data
  res.json({
    profile,
    goal,
    account,
    progress
  });
};
