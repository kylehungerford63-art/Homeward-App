export function getSimpleBudgetSummary() {
  return {
    mode: "simple",
    categories: [
      { name: "Food", limit: 400, spent: 220 },
      { name: "Gas", limit: 150, spent: 90 },
      { name: "Bills", limit: 800, spent: 760 }
    ],
    month: "2026-05"
  };
}
