// src/components/LoginPage.js
import React, { useState } from "react";
import axios from "axios";
import "../App.css";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

import { BACKEND_URL, API_ROUTES } from "../api/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    try {
      const res = await axios.post(`${BACKEND_URL}${API_ROUTES.login}`, {
        email,
        password,
      });

      if (res.data.ok) {
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("role", res.data.role);
        localStorage.setItem("email", res.data.email);

        // ⭐ EMPLOYEE LOGIN
        if (res.data.role === "employee") {
          localStorage.setItem("userId", res.data.id);          // IMPORTANT
          localStorage.setItem("employeeName", res.data.name);
          localStorage.setItem("employeeLoggedIn", "true");     // REQUIRED

          window.location.href = "/home";
          return;
        }

        // ⭐ ADMIN LOGIN
        if (res.data.role === "admin") {
          localStorage.setItem("adminEmail", res.data.email);
          window.location.href = "/admin";
          return;
        }
      }
    } catch (err) {
      const msg =
        err?.response?.data?.error || "Login failed. Please try again.";
      setError(msg);
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: "100vh", backgroundColor: "#e9f7f5" }}
    >
      <form
        onSubmit={handleSubmit}
        className="shadow"
        style={{
          width: "620px",
          background: "white",
          padding: "35px 40px",
          borderRadius: "12px",
          boxShadow: "0 8px 25px rgba(0,0,0,0.12)",
        }}
      >
        {/* Logo */}
        <div className="text-center mb-2">
          <img
            src="./src/images/logo_company.png"
            alt="logo"
            style={{ width: 68, marginBottom: "10px" }}
          />
        </div>

        {/* Title */}
        <h4
          className="text-center mb-1"
          style={{ fontWeight: 700, color: "#008f7a" }}
        >
          Immortal Future Infotech
        </h4>

        <p
          className="text-center"
          style={{
            color: "#6a6a6a",
            marginTop: "-4px",
            marginBottom: "20px",
            fontSize: "14px",
          }}
        >
          Technology lives here
        </p>

        {/* Error */}
        {error && (
          <div className="alert alert-danger py-2 text-center">{error}</div>
        )}

        {/* Email */}
        <div className="mb-3">
          <label className="form-label fw-semibold" style={{ fontSize: "14px" }}>
            Email ID <span style={{ color: "red" }}>*</span>
          </label>

          <input
            type="email"
            className="form-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="abc@gmail.com"
            style={{
              height: "42px",
              borderRadius: "8px",
              borderColor: "#cfd8dc",
            }}
          />
        </div>

        {/* Password */}
        <div className="mb-3 position-relative">
          <label className="form-label fw-semibold" style={{ fontSize: "14px" }}>
            Password <span style={{ color: "red" }}>*</span>
          </label>

          <input
            type={showPassword ? "text" : "password"}
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="abc@123"
            style={{
              height: "42px",
              borderRadius: "8px",
              borderColor: "#cfd8dc",
              paddingRight: "40px",
            }}
          />

          {/* Eye toggle */}
          <span
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              right: "12px",
              top: "40px",
              cursor: "pointer",
            }}
          >
            {showPassword ? (
              <VisibilityOffIcon style={{ color: "#00a693" }} />
            ) : (
              <VisibilityIcon style={{ color: "#00a693" }} />
            )}
          </span>
        </div>

        {/* Button */}
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
          Login
        </button>
        {/* Forgot Password */}
<div className="text-center mt-3">
  <span
    onClick={() => (window.location.href = "/forgot-password")}
    style={{
      color: "#00a693",
      fontWeight: 600,
      cursor: "pointer",
      fontSize: "15px",
    }}
  >
    Forgot Password?
  </span>
</div>

      </form>
    </div>
  );
}
