// backend/engine/testBuckets.js
const { calculateBuckets } = require('./bucketEngine.js');

const out = calculateBuckets({
  house_price: 450000,
  current_balance: 75000,
  down_payment_percent: 0.2,
  closing_cost_percent: 0.03,
  moving_cost_fixed: 10000,
  extra_savings_target: 15000
});

console.log("LOCAL ENGINE OUTPUT:", JSON.stringify(out, null, 2));
