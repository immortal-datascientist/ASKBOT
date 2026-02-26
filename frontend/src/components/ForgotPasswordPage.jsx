import React, { useState } from "react";
import axios from "axios";
import { BACKEND_URL, API_ROUTES } from "../api/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

 const handleSendOtp = async (e) => {
  e.preventDefault();
  setMsg("");

  if (!email) {
    setMsg("Email is required.");
    return;
  }

  try {
    const res = await axios.post(
      `${BACKEND_URL}${API_ROUTES.sendOtp}`,
      { email }
    );

    if (res.data.ok) {
      setMsg("OTP has been sent to your email.");

      // Save email for next page
      localStorage.setItem("resetEmail", email);

      // ⏳ Wait 5 seconds before navigating
      setTimeout(() => {
        window.location.href = "/reset-password";
      }, 1000);
    }
  } catch (err) {
    setMsg(err?.response?.data?.error || "Failed to send OTP");
  }
};

  return (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: "100vh", backgroundColor: "#e9f7f5" }}
    >
      <form
        onSubmit={handleSendOtp}
        className="shadow"
        style={{
          width: "620px",
          background: "white",
          padding: "35px 40px",
          borderRadius: "12px",
          boxShadow: "0 8px 25px rgba(0,0,0,0.12)",
        }}
      >
        <h3 className="text-center mb-3" style={{ color: "#00a693", fontWeight: 700 }}>
          Forgot Password
        </h3>

        <p className="text-center text-muted" style={{ marginTop: "-10px" }}>
          Enter your registered email to receive an OTP.
        </p>

        {msg && (
          <div className="alert alert-info text-center py-2">{msg}</div>
        )}

        <div className="mb-3">
          <label className="form-label fw-semibold">Email ID</label>
          <input
            type="email"
            className="form-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@gmail.com"
            style={{ height: "42px", borderRadius: "8px" }}
          />
        </div>

        <button
          type="submit"
          className="btn w-100 mt-2"
          style={{
            backgroundColor: "#00a693",
            color: "white",
            fontWeight: 600,
            height: "44px",
            borderRadius: "8px",
          }}
        >
          Send OTP
        </button>

        <div className="text-center mt-3">
          <span
            onClick={() => (window.location.href = "/")}
            style={{
              color: "#00a693",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            ← Back to Login
          </span>
        </div>
      </form>
    </div>
  );
}
