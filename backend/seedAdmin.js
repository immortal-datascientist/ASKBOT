// server/seedAdmin.js
const bcrypt = require("bcryptjs");
const pool = require("./db");
require("dotenv").config();

async function seed() {
  const email = "hr@ifit.co.in";
  const password = "askbot_immortal@123";
  const hash = await bcrypt.hash(password, 10);

  const conn = await pool.getConnection();
  try {
    await conn.query("CREATE DATABASE IF NOT EXISTS ??", [process.env.DB_NAME || "immortal_db"]);
    await conn.query("USE ??", [process.env.DB_NAME || "immortal_db"]);

    // Create tables if missing (ensure schema exists)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS admin (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await conn.query(`
  CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    password_plain VARCHAR(255),
    domain ENUM('finacle','fullstack','datascience') NOT NULL,
    status ENUM('active','inactive') DEFAULT 'inactive',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);


    // Insert or update default admin
    const [rows] = await conn.query("SELECT * FROM admin WHERE email = ?", [email]);
    if (rows.length === 0) {
      await conn.query("INSERT INTO admin (email, password_hash) VALUES (?, ?)", [email, hash]);
      console.log("Inserted default admin:", email);
    } else {
      await conn.query("UPDATE admin SET password_hash = ? WHERE email = ?", [hash, email]);
      console.log("Updated default admin password.");
    }
  } catch (err) {
    console.error(err);
  } finally {
    conn.release();
    process.exit(0);
  }
}

seed();
