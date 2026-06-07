// backend/middleware/requireAuth.js
const jwt = require("jsonwebtoken");
const userRepo = require("../db/userRepository");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

module.exports = async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  // If no token → guest mode (use UUID compatible with DB)
  if (!authHeader) {
    req.user = { id: "00000000-0000-0000-0000-000000000000", guest: true };
    console.log("[requireAuth] guest user set:", req.user);
    return next();
  }

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not authorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    const user = await userRepo.findUserById(payload.userId);

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = user;
    console.log("[requireAuth] authenticated user set:", { id: user.id });
    next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(401).json({ error: "Invalid token" });
  }
};
