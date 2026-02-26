// src/components/Home.js
import React from "react";
import Image1 from "../images/logo.png";
import "./Home.css";

export default function Home() {
  const BRAND = "#64E2B7";

  return (
    <div className="p-4 text-center mt-5">
      {/* ===== Image Section ===== */}
      <div className="d-flex justify-content-center">
        <img
          src={Image1}
          alt="Chatbot and PDF Queries"
          className="img-fluid rounded-4 shadow-sm mt-5 home-image"
          style={{
            width: "100%", // ✅ fully responsive width
            maxWidth: "950px", // ✅ limit desktop width
            height: "auto",
            border: `3px solid ${BRAND}`,
            borderRadius: "18px",
          }}
        />
      </div>

      {/* ===== Title & Text ===== */}
      <h2 className="fw-bold mb-4 mt-5" style={{ color: "#04352d" }}>
        CHATBOT - PDF QUERIES
      </h2>
      <p className="text-secondary mb-4">
        Explore interactive chat assistance and SQL query examples below.
      </p>

      <p className="mt-3 text-secondary small">
        Get started with AI Chatbot and SQL PDF Queries on LearnHub.
      </p>
    </div>
  );
}
