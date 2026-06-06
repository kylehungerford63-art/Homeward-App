const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// AUTH
app.use("/api/auth", require("./routes/auth"));

// PROFILE
app.use("/api/profile", require("./routes/profile"));

// GOAL
app.use("/api/goal", require("./routes/goal"));

// DASHBOARD
app.use("/api/dashboard", require("./routes/dashboard"));

// BUDGET
app.use("/api/budget/category", require("./api/budget/addCategory"));
app.use("/api/budget/envelope", require("./api/budget/addEnvelope"));
app.use("/api/budget/mode", require("./api/budget/mode"));
app.use("/api/budget/summary", require("./api/budget/summary"));

// TRANSACTIONS
app.use("/api/transactions", require("./api/transactions/transactions"));

// Serve frontend
app.use(express.static(path.join(__dirname, "../www")));

// SPA fallback (Express 5-safe)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../www/index.html"));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
