// src/App.js
import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Home from "./components/Home";
import Sidebar from "./components/Sidebar";
import FinacleTraining from "./components/FinacleTraining";
import LoginPage from "./components/LoginPage";
import AdminPage from "./components/AdminPage";
import FullStack from "./components/FullStack";
import DataScience from "./components/DataScience";
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import ResetPasswordPage from "./components/ResetPasswordPage";
import ForgotPasswordPage from "./components/ForgotPasswordPage";
import TestInstructions from "./components/TestInstructions";
import TestRunner from "./components/TestRunner";
import AdminEvaluation from "./components/AdminEvaluation";
import UserTestResult from "./components/UserTestResult";



import "./App.css";

function Layout({ sidebarOpen, setSidebarOpen }) {
  const location = useLocation();

  const isLoginPage = location.pathname === "/";
  const isAdminPage = location.pathname.startsWith("/admin");

  // Get auth info
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const role = localStorage.getItem("role"); // "admin" OR "employee"

  const isEmployee = role === "employee";

  // MOBILE DETECTION
  const isMobile = window.innerWidth <= 768;

  const isTestPage =
    location.pathname.startsWith("/test-instructions") ||
    location.pathname.startsWith("/test-runner");

  return (
    <div>
      {/* Sidebar only for EMPLOYEES */}
      { !isTestPage && !isLoginPage && !isAdminPage && isLoggedIn && isEmployee && (
        <Sidebar
          sidebarOpen={sidebarOpen}
          toggleSidebar={(value) => {
            if (typeof value === "boolean") {
              setSidebarOpen(value);
            } else {
              setSidebarOpen(!sidebarOpen);
            }
          }}
          isMobile={isMobile}
        />
      )}

      <div
        className="min-vh-100 bg-light"
        style={{
          marginLeft:
           !isTestPage && !isLoginPage && !isAdminPage && isLoggedIn && isEmployee
              ? isMobile
                ? "0px" // ⭐ Mobile does NOT push content
                : sidebarOpen
                ? "250px"
                : "80px"
              : "0px",
          transition: "margin-left 0.3s ease-in-out",
        }}
      >
        {/* Header only for EMPLOYEES */}
        {!isTestPage && !isLoginPage && !isAdminPage && isLoggedIn && isEmployee && (
         <div
  className="hello border-bottom bg-white d-flex align-items-center"
  style={{
    position: "fixed",
    top: 0,
    left: !isMobile && sidebarOpen ? "250px" : !isMobile ? "80px" : "0px",
    width: !isMobile ? "calc(100% - 80px)" : "100%",
    zIndex: 50000,
    height: isMobile ? "70px" : "75px",
    padding: "10px",
  }}
>

            {/* ⭐ MOBILE HAMBURGER ICON */}
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="btn border-0 me-1"
                style={{ fontSize: "28px", marginTop: "-4px" }}
              >
                ☰
              </button>
            )}

            <h5
  className={`d-flex align-items-center ${!isMobile ? "ms-3" : ""}`}
>

  {/* ⭐ MOBILE: SHOW LOGO IMAGE */}
 {isMobile && location.pathname !== "/finacle-training" && (
  <img
    src="/src/images/logo_company.png"
    alt="IFIT Logo"
    style={{ width: 50, marginRight: 1, marginTop: 10 }}
  />
)}


  {/* ⭐ DESKTOP: SHOW ICON */}
  {!isMobile && (
    <SchoolRoundedIcon
      style={{ fontSize: "28px", marginRight: "8px" }}
    />
  )}

  {/* ⭐ TEXT DIFFERENT FOR MOBILE & DESKTOP */}
 {/* HIDE TITLE ONLY ON MOBILE + FINACLE PAGE */}
{isMobile && location.pathname === "/finacle-training" ? (
  ""
) : isMobile ? (
   <span style={{ marginTop: "10px", display: "inline-block" }}>
  Immortal Future Infotech
  </span>
) : (
    "Immortal Learning Platform"
)}

</h5>

          </div>
        )}

        <Routes>
          {/* LOGIN PAGE */}
          <Route path="/" element={<LoginPage />} />

          {/* EMPLOYEE PAGES */}
          <Route path="/home" element={isLoggedIn ? <Home /> : <LoginPage />} />

          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route
            path="/finacle-training"
            element={isLoggedIn && isEmployee ? <FinacleTraining /> : <LoginPage />}
          />
          <Route path="/test-instructions" element={<TestInstructions />} />
         <Route path="/test-runner" element={<TestRunner />} />


          <Route path="/fullstack" element={<FullStack />} />
          <Route path="/datascience" element={<DataScience />} />
          <Route path="/admin/evaluation" element={<AdminEvaluation />} />
          <Route path="/test-result/:testId" element={<UserTestResult />} />

          {/* ADMIN PAGE */}
          <Route
            path="/admin"
            element={isLoggedIn && role === "admin" ? <AdminPage /> : <LoginPage />}
          />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <Router>
      <Layout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
    </Router>
  );
}
