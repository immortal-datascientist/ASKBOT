const transporter = require("../mailer");

/* ============================================================================
   TEMPLATE GENERATOR — Professional IT Email Layout
============================================================================ */
function generateEmailTemplate(title, messageContent) {
  return `
  <div style="
      width: 100%;
      background: #f4f7fa;
      padding: 40px 0;
      font-family: Arial, sans-serif;
  ">
    <div style="
        max-width: 550px;
        margin: auto;
        background: #ffffff;
        border-radius: 10px;
        padding: 30px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    ">
      <h2 style="
          text-align: center;
          color: #00a693;
          margin-bottom: 10px;
          font-size: 24px;
      ">
        Immortal Future Infotech
      </h2>

      <p style="text-align: center; margin-top: -8px; color: #777;">
        Technology Lives Forever
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />

      <h3 style="
          color: #333;
          margin-bottom: 15px;
          font-size: 20px;
      ">
        ${title}
      </h3>

      <div style="
          font-size: 15px;
          color: #444;
          line-height: 1.6;
      ">
        ${messageContent}
      </div>

      <br/>

      <p style="margin-top: 10px; color: #555;">
        Regards,<br/>
        <b>HR Team</b><br/>
        Immortal Future Infotech
      </p>

    </div>
  </div>
  `;
}

/* ============================================================================
   1️⃣ SEND OTP EMAIL
============================================================================ */
async function sendOtpMail(to, otp, username = "User") {
  const html = generateEmailTemplate(
    "Your OTP Verification Code",
    `
      <p>Hello <b>${username}</b>,</p>
      <p>Your One-Time Password (OTP) for verification is:</p>

      <div style="
          text-align: center;
          font-size: 32px;
          font-weight: bold;
          color: #00a693;
          margin: 20px 0;
      ">
        ${otp}
      </div>

      <p>This OTP is valid for <b>5 minutes</b>.</p>
      <p>Please do not share this OTP with anyone.</p>
    `
  );

  return transporter.sendMail({
    from: `<${process.env.MAIL_USER}>`,
    to,
    subject: "Your OTP Code – Immortal Future Infotech",
    html,
  });
}

/* ============================================================================
   2️⃣ SEND USER CREDENTIALS EMAIL
============================================================================ */
async function sendUserCredentials(email, username, password) {
  const html = generateEmailTemplate(
    "Your Login Credentials For Askbot",
    `
      <p>Hello <b>${username}</b>,</p>

      <div style="
          background: #f1fdf8;
          padding: 15px;
          border-left: 4px solid #00a693;
          border-radius: 6px;
          margin: 20px 0;
      ">
        <p><b>Email:</b> ${email}</p>
        <p><b>Password:</b> ${password}</p>
      </div>

      <p>Please login using these credentials and do not share them with anyone for security reasons.</p>
    `
  );

  return transporter.sendMail({
    from: `<${process.env.MAIL_USER}>`,
    to: email,
    subject: "Askbot Account Login Details – Immortal Future Infotech",
    html,
  });
}

module.exports = {
  sendOtpMail,
  sendUserCredentials,
};
