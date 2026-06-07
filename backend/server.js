// backend/server.js
const path = require("path");

// Load root .env immediately so all modules see it
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const express = require("express");
const cors = require("cors");
const pathLib = require("path");

const requireAuth = require("./middleware/requireAuth");

const app = express();

app.use(cors());
app.use(express.json());

// Apply auth middleware to all /api routes
app.use("/api", requireAuth);

// AUTH (login/register does NOT require auth)
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
app.use(express.static(pathLib.join(__dirname, "../www")));

// SPA fallback
app.get(/.*/, (req, res) => {
  res.sendFile(pathLib.join(__dirname, "../www/index.html"));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
