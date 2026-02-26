import React, { useEffect, useState } from "react";

import { Link, useLocation, useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import AskbotLogo from "../images/logo_company.png";
import axios from "axios";
import LogoutIcon from "@mui/icons-material/Logout";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import SettingsIcon from "@mui/icons-material/Settings";
import { BACKEND_URL, API_ROUTES } from "../api/api";
import UserReportView from "./UserReportView";


export default function Sidebar({ sidebarOpen, toggleSidebar }) {
  const [openReportPopup, setOpenReportPopup] = React.useState(null);
  const [completedTests, setCompletedTests] = useState({});
  const BRAND = "#64E2B7";
  const location = useLocation();
  const isFinacleMenu = location.pathname.startsWith("/finacle");

  const navigate = useNavigate();
const isMobile = window.innerWidth <= 768;

// ✅ MOVE THIS UP HERE
const [hoverExpand, setHoverExpand] = useState(false);

// ✅ THEN define effectiveOpen
const effectiveOpen = isMobile ? sidebarOpen : sidebarOpen || hoverExpand;



  const userName = localStorage.getItem("employeeName") || "employee";
  

  const [showSettings, setShowSettings] = React.useState(false);
  const [showInfoPopup, setShowInfoPopup] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [notifications, setNotifications] = React.useState([]);
const [activeNotification, setActiveNotification] = React.useState(null);


  

  const isActive = (path) => {
    if (path === "/finacle-training") {
      return location.pathname.startsWith("/finacle-");
    }
    return location.pathname === path;
  };

  const menuItems = [
    { to: "/home", icon: "bi-house", label: "Home" },
    { to: "/finacle-training", icon: "bi-journal-code", label: "Finacle" },
    { to: "/fullstack", icon: "bi-database", label: "Full-Stack Development" },
    { to: "/datascience", icon: "bi-robot", label: "Data Science" },
  ];

   
  
  const handleLogout = async () => {
    try {
      const role = localStorage.getItem("role");

      if (role === "employee") {
        const id = localStorage.getItem("userId");
        if (id) await axios.post(`${BACKEND_URL}${API_ROUTES.userLogout}`, { id });
      }

      localStorage.clear();
      navigate("/");
      window.location.reload();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  useEffect(() => {
  if (!showNotifications) return;

  const fetchNotifications = async () => {
    const userId = localStorage.getItem("userId");
    const userName = localStorage.getItem("employeeName");

    const res = await axios.get(
      `${BACKEND_URL}/api/notifications/${userId}`
    );

    if (res.data.ok) {
      setNotifications(res.data.notifications);

      // 🔑 CHECK COMPLETED TESTS
      const completed = {};

      for (const n of res.data.notifications) {
        try {
          const sub = await axios.get(
            `${BACKEND_URL}/api/evaluation/submission/${n.testId}/${userName}`
          );
          if (sub.data.ok) {
            completed[n.id] = true;   // use notificationId / assignmentId

          }
        } catch {
          completed[n.testId] = false;
        }
      }

      setCompletedTests(completed);
    }
  };

  fetchNotifications();
}, [showNotifications]);


  useEffect(() => {
  if (!showNotifications) return;

  const userId = localStorage.getItem("userId");

  const markRead = async () => {
    await Promise.all(
      notifications
        .filter((n) => !n.isRead)
        .map((n) =>
          axios.post(`${BACKEND_URL}/api/notifications/mark-read`, {
            userId,
            notificationId: n.id,
          })
        )
    );

    // 🔥 FIX: update badge immediately
    setUnreadCount(0);
  };

  markRead();
}, [showNotifications, notifications]);


 useEffect(() => {
  const fetchCount = async () => {
    const userId = localStorage.getItem("userId");
    const res = await axios.get(
      `${BACKEND_URL}/api/notifications/unread-count/${userId}`
    );
    if (res.data.ok) setUnreadCount(res.data.count);
  };

  fetchCount();
}, []);
useEffect(() => {
  const fetchCount = async () => {
    const userId = localStorage.getItem("userId");
    console.log("🔔 Sidebar userId:", userId);

    const res = await axios.get(
      `${BACKEND_URL}/api/notifications/unread-count/${userId}`
    );

    console.log("🔔 Unread count response:", res.data);

    if (res.data.ok) setUnreadCount(res.data.count);
  };

  fetchCount();
}, []);

useEffect(() => {
  if (!showNotifications) return;

  const fetchNotifications = async () => {
    const userId = localStorage.getItem("userId");

    const res = await axios.get(
      `${BACKEND_URL}/api/notifications/${userId}`
    );

    if (res.data.ok) {
      setNotifications(res.data.notifications);
      setActiveNotification(null);

    }
  };

  fetchNotifications();
}, [showNotifications]);



  return (
    <>
      {/* MOBILE BACKDROP */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => toggleSidebar(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 1030,
          }}
        />
      )}

      {/* SIDEBAR */}
      <div
  className="position-fixed top-0 bottom-0 bg-white shadow-sm d-flex flex-column"
  onMouseEnter={() => {
    if (!sidebarOpen && !isMobile) setHoverExpand(true);
  }}
  onMouseLeave={() => {
    if (!sidebarOpen && !isMobile) setHoverExpand(false);
  }}
  style={{
    width: isMobile ? "260px" : effectiveOpen ? "250px" : "100px",
    left: isMobile ? (sidebarOpen ? "0" : "-270px") : "0",
    transition: "all 0.25s ease",
    borderRight: "2px solid #e5e5e5",
    zIndex: 9999999,
  }}
>

        {/* HEADER */}
        <div
          className="d-flex justify-content-between align-items-center px-3 py-3 border-bottom"
          style={{ background: "rgba(100,226,183,0.15)" }}
        >
          <div className="d-flex align-items-center gap-2">
            <img
              src={AskbotLogo}
              alt="Askbot Logo"
              style={{ width: "50px", height: "50px", borderRadius: "6px" }}
            />

            {(isMobile || effectiveOpen)
 && (
              <span className="fw-bold fs-5" style={{ color: "#04352d" }}>
                Askbot
              </span>
            )}
          </div>

          <button
             onClick={() => {
    setHoverExpand(false); // ✅ reset hover mode
    toggleSidebar();
  }}
            className="btn btn-sm border-0"
            style={{
              background: BRAND,
              color: "#04352d",
              borderRadius: "50%",
              width: "30px",
              height: "30px",
            }}
          >
            <i
              className={`bi ${
                sidebarOpen ? "bi-chevron-left" : "bi-chevron-right"
              }`}
            />
          </button>
        </div>

        {/* MENU */}
        <div className="px-3 py-3">
          {menuItems.map((item, index) => (
            <SidebarItem
              key={index}
              to={item.to}
              icon={item.icon}
              label={isMobile || effectiveOpen ? item.label : ""}
              active={isActive(item.to)}
              isMobile={isMobile}
              toggleSidebar={toggleSidebar}
            />
          ))}
        </div>

        {/* USER SECTION */}
        <div className="mt-auto position-relative">
          {(isMobile || effectiveOpen)
&& (
            <div className="px-3 py-3 border-top d-flex align-items-center gap-2">
              <AccountCircleIcon style={{ fontSize: 28, color: "#00a693" }} />
              <span className="fw-semibold">{userName}</span>

              <div className="ms-auto position-relative">
                <div style={{ position: "relative" }}>
  <SettingsIcon
    style={{ fontSize: 30, cursor: "pointer", color: "#00a693" }}
    onClick={() => setShowSettings((p) => !p)}
  />

  {unreadCount > 0 && (
    <span
      style={{
        position: "absolute",
        top: -4,
        right: -4,
        background: "red",
        color: "white",
        borderRadius: "50%",
        width: 16,
        height: 16,
        fontSize: 10,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
      }}
    >
      {unreadCount}
    </span>
  )}
</div>


                {showSettings && (
                  <div
                    className="position-absolute shadow-sm"
                    style={{
                      bottom: "45px",
                      right: 0,
                      background: "#fff",
                      borderRadius: "10px",
                      padding: "10px",
                      border: "2px inset #00a693",
                      width: "160px",
                      zIndex: 9999,
                    }}
                  >
                    
                 <button
  className="btn w-100 mb-2 d-flex align-items-center justify-content-center position-relative"
  style={{
    backgroundColor: "#e6f7f4",
    fontWeight: 600,
    borderRadius: "8px",
    color: "#04352d",
  }}
  onClick={() => {
  if (isFinacleMenu) {
    setShowNotifications(true);
  }
  setShowSettings(false);
}}

>
  <NotificationsNoneIcon className="me-1" />
  Notifications

  {unreadCount > 0 && (
    <span
      style={{
        position: "absolute",
        top: "-6px",
        right: "-6px",
        background: "red",
        color: "white",
        borderRadius: "50%",
        width: 18,
        height: 18,
        fontSize: 11,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {unreadCount}
    </span>
  )}
</button>


                    <button
                      className="btn w-100 mb-2 d-flex align-items-center justify-content-center"
                      style={{
                        backgroundColor: BRAND,
                        fontWeight: 600,
                        borderRadius: "8px",
                      }}
                      onClick={() => {
  if (isFinacleMenu) {
    setShowInfoPopup(true);
  }
  setShowSettings(false);
}}

                    >
                      <InfoOutlinedIcon className="me-1" /> Info
                    </button>

                    <button
                      className="btn w-100 text-white d-flex align-items-center justify-content-center"
                      style={{
                        backgroundColor: "#ff4d4d",
                        fontWeight: 600,
                        borderRadius: "8px",
                      }}
                      onClick={handleLogout}
                    >
                      <LogoutIcon className="me-1" /> Logout
                    </button>

                  </div>
                )}
              </div>
            </div>
          )}

          {!isMobile && !effectiveOpen && (

            <div className="py-3 border-top d-flex justify-content-center position-relative">
              <div style={{ position: "relative" }}>
  <SettingsIcon
    style={{ fontSize: 30, cursor: "pointer", color: "#00a693" }}
    onClick={() => setShowSettings((p) => !p)}
  />

  {unreadCount > 0 && (
    <span
      style={{
        position: "absolute",
        top: -4,
        right: -4,
        background: "red",
        color: "white",
        borderRadius: "50%",
        width: 16,
        height: 16,
        fontSize: 10,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
      }}
    >
      {unreadCount}
    </span>
  )}
</div>


              {showSettings && (
                <div
                  className="position-absolute shadow-sm d-flex flex-column align-items-center gap-3"
                  style={{
                    bottom: "70px",
                    background: "#fff",
                    borderRadius: "12px",
                    padding: "12px 10px",
                    width: "60px",
                    border: "2px solid #00a693",
                    zIndex: 9999,
                  }}
                >
             <div
  style={{ position: "relative", cursor: "pointer" }}
  onClick={() => {
  if (isFinacleMenu) {
    setShowNotifications(true);
  }
  setShowSettings(false);
}}

>
  <NotificationsNoneIcon />

  {unreadCount > 0 && (
    <span
      style={{
        position: "absolute",
        top: -5,
        right: -5,
        background: "red",
        color: "white",
        borderRadius: "50%",
        width: 18,
        height: 18,
        fontSize: 11,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      {unreadCount}
    </span>
  )}
</div>



                  <InfoOutlinedIcon
                    style={{ cursor: "pointer", color: "#00a693" }}
                    onClick={() => {
  if (isFinacleMenu) {
    setShowInfoPopup(true);
  }
  setShowSettings(false);
}}

                  />
                  <LogoutIcon
                    style={{ cursor: "pointer", color: "#ff4d4d" }}
                    onClick={handleLogout}
                  />

                </div>
              )}
            </div>
          )}

          {(isMobile || effectiveOpen)
 && (
            <div className="px-3 py-2 text-center small fw-semibold">
              © 2025 Askbot
            </div>
          )}
        </div>
      </div>

      {showInfoPopup && <InfoPopup onClose={() => setShowInfoPopup(false)} />}
      {showNotifications && (
  <div
    onClick={() => setShowNotifications(false)}
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.35)",
      zIndex: 2000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      top:"50px"
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
     style={{
  width: "min(560px, 95%)",   // ⬅ wider popup
  maxHeight: "80vh",         // ⬅ keeps it centered vertically
  background: "#fff",
  borderRadius: "16px",
  padding: "24px",
  boxShadow: "0 10px 32px rgba(0,0,0,0.3)",
  display: "flex",
  flexDirection: "column",
}}

    >
      {/* 🔔 HEADER */}
      <h5 className="fw-bold mb-3" style={{ color: "#04352d" }}>
        Notifications
      </h5>

      {/* 📩 NOTIFICATION LIST */}
     <div
  style={{
    flex: 1,
    overflowY: "auto",
    paddingRight: "6px",
  }}
>

        {notifications.length === 0 && (
          <p className="text-muted text-center">
            No notifications available
          </p>
        )}

        {notifications.map((n) => (
          <div
            key={n.id}
            className="mb-3 p-3"
            style={{
              borderRadius: "12px",
              border: "1px solid #e5e5e5",
              backgroundColor: n.isRead ? "#f9f9f9" : "#e6f7f4",
            }}
          >
            <h6 className="fw-bold mb-2">{n.title}</h6>

            <p style={{ lineHeight: 1.6 }}>
              {n.message}
              <br />
              <b>Test:</b> {n.testId}
            </p>

           <div className="d-flex justify-content-end gap-2">
  {/* ➕ ADD REPORT BUTTON */}
  <button
  className="btn btn-sm"
  style={{
    backgroundColor: "#0d6efd",
    color: "#fff",
  }}
  onClick={async () => {
    const cleanUserName = localStorage
      .getItem("employeeName")
      ?.trim();

    const cleanTestId = String(n.testId).replace(/\.pdf$/i, "");

    try {
      const res = await axios.get(
        `${BACKEND_URL}/api/evaluation/result/${cleanTestId}/${cleanUserName}`,
        {
          params: { attempt: 1 } // backend supports this
        }
      );

      if (!res.data.ok) {
        alert("⚠️ Report not generated yet");
        return;
      }

      setOpenReportPopup({
        ...n,
        testId: cleanTestId
      });

    } catch (err) {
      alert("⚠️ Report not generated yet");
    }
  }}
>
  Reports
</button>






{n.isCompleted ? (
  <button
    className="btn btn-sm"
    disabled
    style={{
      backgroundColor: "#d4edda",
      color: "#155724",
      fontWeight: 600,
    }}
  >
    🎉 Completed
  </button>
) : (
  <button
    className="btn btn-sm"
    style={{
      backgroundColor: "#00a693",
      color: "#fff",
    }}
    onClick={() => {
      navigate(
        `/test-instructions?testId=${n.testId}&pdf=${n.pdf}`
      );
      setShowNotifications(false);
    }}
  >
    Start Test
  </button>
)}


</div>

          </div>
        ))}
      </div>

      {/* ❌ CLOSE BUTTON */}
      <div className="d-flex justify-content-end mt-3">
       <button
  className="btn btn-danger"
  onClick={async () => {
    setShowNotifications(false);

    const userId = localStorage.getItem("userId");
    const res = await axios.get(
      `${BACKEND_URL}/api/notifications/unread-count/${userId}`
    );

    if (res.data.ok) setUnreadCount(res.data.count);
  }}
>
  Close
</button>

      </div>
    </div>
  </div>
)}

{openReportPopup && (
  <div
    onClick={() => setOpenReportPopup(null)}
    style={{
      position: "fixed",
      top:80,
      inset: 0,
      background: "rgba(0,0,0,0.45)",
      zIndex: 999999993000,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        width: "min(1300px, 95%)",
        maxHeight: "95vh",
        background: "#fff",
        borderRadius: "18px",
        padding: "24px",
        overflowY: "auto",
        boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
      }}
    >
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="fw-bold">
          Test Report – {openReportPopup.testId}
        </h4>
        <button
          className="btn btn-sm btn-danger"
          onClick={() => setOpenReportPopup(null)}
        >
          ✕
        </button>
      </div>

      {/* 🔥 REPORT CONTENT */}
      <UserReportView
  testId={openReportPopup.testId}
  userName={localStorage.getItem("employeeName")?.toLowerCase()}
/>

    </div>
  </div>
)}
    </>
  );
}




/* ---------------- ITEM COMPONENT (CENTERED ICON FIX) ---------------- */
function SidebarItem({ to, icon, label, active, isMobile, toggleSidebar }) {
  const BRAND = "#64E2B7";
  const isCollapsed = label === "";

  return (
    <Link
      to={to}
      onClick={() => isMobile && toggleSidebar(false)}
      className={`text-decoration-none mb-3 shadow-sm d-flex ${
        isCollapsed
          ? "justify-content-center align-items-center"
          : "align-items-center"
      } ${active ? "active" : ""}`}
      style={{
        borderRadius: "12px",
        border: `2px solid ${BRAND}`,
        background: active ? "rgba(100,226,183,0.2)" : "#fff",
        color: "#04352d",
        fontWeight: 600,
        height: "60px",            // 🔑 FIX
        padding: isCollapsed ? "0" : "12px",
      }}
    >
      <i
        className={`bi ${icon}`}
        style={{
          fontSize: "1.6rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      />
      {!isCollapsed && <span style={{ marginLeft: "15px" }}>{label}</span>}
    </Link>
  );
}



/* ---------------- INFO POPUP ---------------- */
function InfoPopup({ onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(620px, 100%)",
          background: "#fff",
          borderRadius: "14px",
          padding: "25px",
          boxShadow: "0 8px 28px rgba(0,0,0,0.25)",
        }}
      >
        <h3 className="text-center fw-bold" style={{ color: "#04352d" }}>
          How it works
        </h3>
        <ul style={{ color: "#04352d", fontSize: "1rem", paddingLeft: "20px" }}>
          <li>➕ Add Session to start chatting.</li>
          <li>⚡ Choose Quick or Deep response mode.</li>
          <li>📄 Use Schedule tab for PDFs & videos.</li>
          <li>💬 Sessions save separately.</li>
          <li>🛠 Rename or delete anytime.</li>
        </ul>
      </div>
    </div>
  );
}
