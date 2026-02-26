import React, { useState } from "react";
import axios from "axios";
import { BACKEND_URL, API_ROUTES } from "../api/api";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";


export default function ResetPasswordPage() {
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  

  const email = localStorage.getItem("resetEmail");

  // ❗ If no email stored → redirect back
  if (!email) {
    window.location.href = "/";
    return null;
  }

  const handleReset = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!otp || !password || !confirmPassword) {
      setMsg("All fields are required.");
      return;
    }

    if (password !== confirmPassword) {
      setMsg("Passwords do not match.");
      return;
    }

    try {
      const res = await axios.post(
        `${BACKEND_URL}${API_ROUTES.resetPassword}`,
        { email, otp, password }
      );

      if (res.data.ok) {
        setMsg("Password reset successful! Redirecting to login...");
        localStorage.removeItem("resetEmail"); // Clear after success
        setTimeout(() => {
          window.location.href = "/";
        }, 1500);
      }
    } catch (err) {
      setMsg(err?.response?.data?.error || "Error resetting password.");
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: "100vh", backgroundColor: "#e9f7f5" }}
    >
      <form
        onSubmit={handleReset}
        style={{
          width: "620px",
          background: "white",
          padding: "35px 40px",
          borderRadius: "12px",
          boxShadow: "0 8px 25px rgba(0,0,0,0.12)",
        }}
      >
        <h3 className="text-center mb-3" style={{ color: "#00a693", fontWeight: 700 }}>
          Reset Password
        </h3>

        <p className="text-center text-muted" style={{ marginTop: "-10px" }}>
          Enter the OTP sent to your email and set a new password.
        </p>

        {msg && <div className="alert alert-info text-center py-2">{msg}</div>}

        <div className="mb-3">
          <label className="form-label fw-semibold">Enter OTP</label>
          <input
            type="text"
            className="form-control"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Enter the OTP"
            style={{ height: "42px", borderRadius: "8px" }}
          />
        </div>
          <div className="mb-3" style={{ position: "relative" }}>
            <label className="form-label fw-semibold">New Password</label>
            
            <input
              type={showPassword ? "text" : "password"}
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New Password"
              style={{ height: "42px", borderRadius: "8px", paddingRight: "40px" }}
            />

            <span
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "12px",
                top: "39px",
                cursor: "pointer",
                color: "#00a693",
              }}
            >
              {showPassword ? <VisibilityOff /> : <Visibility />}
            </span>
          </div>


            <div className="mb-3" style={{ position: "relative" }}>
            <label className="form-label fw-semibold">Confirm Password</label>

            <input
              type={showConfirmPassword ? "text" : "password"}
              className="form-control"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              style={{ height: "42px", borderRadius: "8px", paddingRight: "40px" }}
            />

          <span
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            style={{
              position: "absolute",
              right: "12px",
              top: "39px",
              cursor: "pointer",
              color: "#00a693",
            }}
          >
            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
          </span>
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
          Reset Password
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
