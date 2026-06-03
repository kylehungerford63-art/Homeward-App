const express = require("express");
const router = express.Router();
const { calculateBuckets } = require("../engine/bucketEngine");

router.post("/calculate", (req, res) => {
    const {
        house_price,
        current_balance,
        down_payment_percent,
        closing_cost_percent,
        moving_cost_fixed,
        extra_savings_target
    } = req.body;

    if (current_balance == null || house_price == null) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const result = calculateBuckets({
        house_price,
        current_balance,
        down_payment_percent,
        closing_cost_percent,
        moving_cost_fixed,
        extra_savings_target
    });

    res.json(result);
});


module.exports = router;
