// backend/db/database.js
const path = require("path");

// Load .env relative to project root
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL || null;

function maskConnectionString(cs) {
  if (!cs) return "<no connection string>";
  try {
    const url = new URL(cs);
    const host = url.hostname;
    const port = url.port;
    const db = url.pathname ? url.pathname.replace(/^\//, "") : "";
    return `${host}:${port}/${db}`;
  } catch (e) {
    return "<invalid connection string>";
  }
}

if (!connectionString) {
  console.error("[database] No DATABASE_URL found in environment.");
} else {
  console.log("[database] connecting to:", maskConnectionString(connectionString));
}

// Decide whether to use SSL
const useSsl = (() => {
  const explicit = process.env.DB_SSL;
  if (explicit === "true") return true;
  if (explicit === "false") return false;
  if (process.env.NODE_ENV === "production") return true;
  if (!connectionString) return false;
  const lower = connectionString.toLowerCase();
  if (lower.includes("sslmode=require")) return true;
  if (/render\.com|rds\.amazonaws\.com|amazonaws|postgres\.azure|db\.google/.test(lower)) {
    return true;
  }
  return false;
})();

const sslConfig = useSsl ? { rejectUnauthorized: false } : false;

let pool;
if (connectionString) {
  pool = new Pool({ connectionString, ssl: sslConfig });
} else {
  pool = new Pool({
    host: process.env.PGHOST || "localhost",
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    user: process.env.PGUSER || process.env.DB_USER,
    password: process.env.PGPASSWORD || process.env.DB_PASS,
    database: process.env.PGDATABASE || process.env.DB_NAME,
    ssl: sslConfig
  });
}

module.exports = pool;
