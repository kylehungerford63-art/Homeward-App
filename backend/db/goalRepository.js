const goals = [
  {
    id: "demo-goal-1",
    target_amount: 120000,
    target_date: "2027-01-01",
    monthly_contribution: 4500
  }
];

async function getGoalById(id) {
  return goals.find(g => g.id === id) || null;
}

module.exports = {
  getGoalById
};
