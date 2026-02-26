const nodemailer = require("nodemailer");
require("dotenv").config();

/**
 * MAILER CONFIGURATION (cPanel / mail.ifit.co.in)
 *
 * Port Rules:
 *  - 465 → SSL → secure: true
 *  - 587 → TLS → secure: false  ✅ (your server uses this)
 */

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,         // mail.ifit.co.in
  port: parseInt(process.env.MAIL_PORT), 
  secure: false,                       // MUST be false for port 587
  auth: {
    user: process.env.MAIL_USER,       // full email address
    pass: process.env.MAIL_PASS,       // email password
  },
  tls: {
    rejectUnauthorized: false,         // required for cPanel SMTP
  },
});

// OPTIONAL: Verify SMTP connection on server startup
transporter.verify((err, success) => {
  if (err) {
    console.error("❌ SMTP Connection Failed:", err);
  } else {
    console.log("📧 SMTP Server Connected Successfully");
  }
});

module.exports = transporter;
