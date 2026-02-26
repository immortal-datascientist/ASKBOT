import React, { useState, useEffect, useRef } from "react";
import FinaclePopup from "../components/FinaclePopup";
import Image2 from "../images/full.png";

import {
  getPdfFiles,
  getDataScienceDayFiles,
  getDataScienceSchedule
} from "../api/api";

export default function DataScience() {
  const ASSET_BASE = import.meta.env.VITE_ASSET_BASE || "";

  const [pdfFiles, setPdfFiles] = useState([]);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState("");
  const scheduleTabRef = useRef(null); // ✅ ADD THIS

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const drawerRef = useRef(null);
  const isMobile = window.innerWidth <= 768;
  const handleToggleDrawer = () => {
  setDrawerOpen(prev => !prev);
};


  const [dayFiles, setDayFiles] = useState({ pdfs: [], videos: { english: [] } });
  const [selectedDayPdf, setSelectedDayPdf] = useState("");
  const [selectedVideo, setSelectedVideo] = useState("");

  // ⭐ Schedule states (same as FullStack)
  const [scheduleFiles, setScheduleFiles] = useState([]);
  const [selectedSchedulePdf, setSelectedSchedulePdf] = useState("");

  const [isFullscreen, setIsFullscreen] = useState(false);

  const pdfIframeRef = useRef(null);

  const BRAND = "#64E2B7";

  /* ---------------- LOAD GLOBAL PDF LIST ---------------- */
  useEffect(() => {
    (async () => {
      const data = await getPdfFiles();
      setPdfFiles(data || []);
      if (data?.length > 0) setSelectedPdfUrl(data[0].url);
    })();
  }, []);

useEffect(() => {
  function handleClickOutside(e) {
    if (!drawerOpen) return;

    // 🔴 IGNORE clicks on schedule tab
    if (
      scheduleTabRef.current &&
      scheduleTabRef.current.contains(e.target)
    ) {
      return;
    }

    // Close only if click is truly outside drawer
    if (
      drawerRef.current &&
      !drawerRef.current.contains(e.target)
    ) {
      setDrawerOpen(false);
    }
  }

  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, [drawerOpen]);


// schedule closing

  const handleScheduleTabClick = (e) => {
  e.stopPropagation();      // 🔴 VERY IMPORTANT
  setDrawerOpen(prev => !prev);
};

  /* ---------------- LOAD DATA SCIENCE SCHEDULE PDFs ---------------- */
  useEffect(() => {
    (async () => {
      const data = await getDataScienceSchedule();
      setScheduleFiles(data || []);
      if (data?.length > 0) setSelectedSchedulePdf(data[0].url);
    })();
  }, []);

  /* ---------------- LOAD DAY FILES ---------------- */
  const handleSelectDay = async (day) => {
    setSelectedDay(day);

    const data = await getDataScienceDayFiles(day);
    setDayFiles(data || { pdfs: [], videos: { english: [] } });

    if (data.pdfs?.length > 0) setSelectedDayPdf(data.pdfs[0].url);
    else setSelectedDayPdf("");

    if (data.videos?.english?.length > 0)
      setSelectedVideo(data.videos.english[0].url);
    else setSelectedVideo("");
  };

  const toggleDrawer = () => setDrawerOpen((p) => !p);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fdfb",
        paddingTop: "80px",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontWeight: 800, color: "#04352d" }}>Data Science</h1>

      {!selectedDay && (
        <p style={{ fontSize: "1.2rem", marginTop: "10px", color: "#04352d" }}>
          Select a training day from the popup.
        </p>
      )}

      {/* ---------------- DAY CONTENT ---------------- */}
      {selectedDay && (
        <div style={{ marginTop: "40px", paddingBottom: "60px" }}>
          <h2
            className="fw-bold mb-4"
            style={{
              color: "#04352d",
              fontSize: "1.8rem",
              paddingBottom: "8px",
            }}
          >
            Day {selectedDay} – Data Science Materials
          </h2>

          {/* ---------------- DOCUMENTS ---------------- */}
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
              width: "90%",
              margin: "0 auto 40px",
              padding: "25px",
              maxWidth: "1100px",
            }}
          >
            <h4 className="fw-semibold mb-3" style={{ color: "#04352d" }}>
              Documents:
            </h4>

            {dayFiles.pdfs?.length > 0 ? (
              <>
                <select
                  value={selectedDayPdf}
                  onChange={(e) => setSelectedDayPdf(e.target.value)}
                  className="form-select mb-4"
                >
                  {dayFiles.pdfs.map((p, i) => (
                    <option key={i} value={p.url}>
                      {p.title}
                    </option>
                  ))}
                </select>

                <div
                  style={{
                    position: isFullscreen ? "fixed" : "relative",
                    inset: isFullscreen ? 0 : "auto",
                    width: isFullscreen ? "100vw" : "100%",
                    height: isFullscreen ? "100vh" : "80vh",
                    background: "#fff",
                    zIndex: isFullscreen ? 9999999 : "auto",
                  }}
                >
                  <iframe
                    ref={pdfIframeRef}
                    key={selectedDayPdf}
                    src={`${ASSET_BASE}${selectedDayPdf}#toolbar=0&navpanes=0&scrollbar=0`}
                    style={{ width: "100%", height: "100%", border: "none" }}
                  />

                  <button
                    onClick={() => setIsFullscreen((p) => !p)}
                    style={{
                      position: "absolute",
                      top: "15px",
                      right: "15px",
                      background: "#fff",
                      borderRadius: "8px",
                      border: "1px solid #ccc",
                      padding: "6px",
                      cursor: "pointer",
                    }}
                  >
                    <img src={Image2} alt="fullscreen" style={{ width: "22px" }} />
                  </button>
                </div>
              </>
            ) : (
              <p>No PDFs available.</p>
            )}
          </div>

          {/* ---------------- VIDEOS ---------------- */}
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
              width: "90%",
              padding: "25px",
              margin: "0 auto",
              maxWidth: "1100px",
            }}
          >
            <h4 className="fw-semibold mb-3">Videos:</h4>

            {dayFiles.videos?.english?.length > 0 ? (
              <>
                <select
                  value={selectedVideo}
                  onChange={(e) => setSelectedVideo(e.target.value)}
                  className="form-select mb-4"
                >
                  {dayFiles.videos.english.map((v, i) => (
                    <option key={i} value={v.url}>
                      {v.title}
                    </option>
                  ))}
                </select>

                <video
                  key={selectedVideo}
                  src={`${ASSET_BASE}${selectedVideo}`}
                  controls
                  disablePictureInPicture
                  controlsList="nodownload"
                  style={{
                    width: "100%",
                    height: "550px",
                    background: "#000",
                    borderRadius: "12px",
                  }}
                />
              </>
            ) : (
              <p>No videos available.</p>
            )}
          </div>
        </div>
      )}

      {/* POPUP */}
      <FinaclePopup module="datascience" setSelectedDay={handleSelectDay} />

      {/* ---------------- SCHEDULE DRAWER ---------------- */}
       <div
  ref={drawerRef}
  className={`schedule-drawer position-fixed shadow-lg ${drawerOpen ? "open" : ""}`}
  style={{
    top: "0",
    height: "100vh",

    /* ⭐ WIDTH: 55vw desktop, 85vw mobile */
    width: isMobile ? "85vw" : "55vw",

    /* ⭐ SLIDE ANIMATION: adjust based on width */
    right: drawerOpen ? "0" : isMobile ? "-85vw" : "-55vw",

    backgroundColor: "#fff",
    borderLeft: `3px solid ${BRAND}`,
    transition: "right 0.4s ease",
    zIndex: 91900,
    display: "flex",
    flexDirection: "column",
    padding: "25px",
  }}
>
        <h3 className="fw-bold mb-3">Data Science Schedule</h3>

        <select
          value={selectedSchedulePdf}
          onChange={(e) => setSelectedSchedulePdf(e.target.value)}
          className="form-select mb-3"
          style={{
  width: "100%",
  maxWidth: isMobile ? "100%" : "100%",
  borderRadius: "10px",
  padding: "12px 14px",
  border: `2px solid ${BRAND}`,
  fontWeight: 600,
  fontSize: "1rem",
}}
        >
          {scheduleFiles.map((p, i) => (
            <option key={i} value={p.url}>
              {p.title}
            </option>
          ))}
        </select>

        {selectedSchedulePdf ? (
          <iframe
            src={`${ASSET_BASE}${selectedSchedulePdf}#toolbar=0&navpanes=0&scrollbar=0`}
            style={{ width: "100%", height: "100%", border: "none" }}
          />
        ) : (
          <p>No PDF to display.</p>
        )}
      </div>

      {/* Schedule Tab */}
         {/* Schedule Tab */}
     {isMobile && (
  <div
  ref={scheduleTabRef}
    onClick={handleScheduleTabClick}
    className="schedule-tab position-fixed d-flex align-items-center justify-content-center"
    style={{
      top: "30%",
      right: drawerOpen ? "85vw" : "0",
      transform: "translateY(-40%)",
      backgroundColor: BRAND,
      color: "#04352d",
      width: "45px",
      height: "110px",
      borderRadius: "10px 0 0 10px",
      cursor: "pointer",
      writingMode: "vertical-rl",
      fontWeight: "600",
      zIndex: 1900,
    }}
  >
    Schedule
  </div>
)}

    </div>
  );
}
