require("dotenv").config({ path: "../.env" });
const fs = require("fs");
const path = require("path");
const pool = require("./database");

async function runSchema() {
  const schemaPath = path.join(__dirname, "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");

  try {
    await pool.query(sql);
    console.log("Schema applied successfully");
  } catch (err) {
    console.error("Error applying schema:", err);
  } finally {
    await pool.end();
  }
}

runSchema();
