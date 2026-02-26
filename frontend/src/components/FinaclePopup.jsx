import React, { useState, useRef, useEffect } from "react";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";




export default function FinaclePopup({
  module = "finacle",
  dayCount=60,
  setSelectedDay = () => {},
}) {
  const BRAND = "#64E2B7";

  // UI States
  const [popupOpen, setPopupOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeDay, setActiveDay] = useState(null);
  const [openedByClick, setOpenedByClick] = useState(false);
  const showTab = !drawerOpen;
  const numbers = Array.from({ length: dayCount }, (_, i) => i + 1);
const [popupImages, setPopupImages] = useState([]);
const [activeImage, setActiveImage] = useState(null);



  const [topics, setTopics] = useState({});
  const [popup1, setPopup1] = useState({ visible: false, day: null, x: 0, y: 0 });
  const [popup2, setPopup2] = useState({ visible: false, day: null });

  // <<< ADDED: re-introduce this state to fix ReferenceError >>
  const [isHoveringPopup, setIsHoveringPopup] = useState(false);

  // NEW REQUIRED STATES
  const [hoverBubble, setHoverBubble] = useState(false);
  const [hoverPopup1, setHoverPopup1] = useState(false);
  const [hoverPopup2, setHoverPopup2] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  const popupRef = useRef(null);
  const drawerRef = useRef(null);
  const scrollRef = useRef(null);
  const tabRef = useRef(null);
  const bubbleRefs = useRef({});

  const [showTopShadow, setShowTopShadow] = useState(false);
  const [showBottomShadow, setShowBottomShadow] = useState(true);

  const isMobile = window.innerWidth <= 768;

useEffect(() => {
  if (!popup2.visible || !popup2.day) return;

  fetch(`/api/${module}/day-image/${popup2.day}`)
    .then(res => res.json())
    .then(data => {
      // ✅ backend may return `url` OR `image`
      const imgPath = data?.url || data?.image;

      if (data.ok && imgPath) {
        const fullUrl = `${window.location.origin}${imgPath}`;

        setPopupImages([fullUrl]);   // normalize to array
        setActiveImage(fullUrl);
      } else {
        setPopupImages([]);
        setActiveImage(null);
      }
    })
    .catch(() => {
      setPopupImages([]);
      setActiveImage(null);
    });
}, [popup2.visible, popup2.day]);







  /* -----------------------------------------
      PATHS FOR TOPIC JSON + IMAGES
  ------------------------------------------ */
  const basePathMap = {
    finacle: "/Finacle_Daywise_select_days",
    fullstack: "/Fullstack_Daywise_select_days",
    datascience: "/Datascience_Daywise_select_days",
  };

  const basePath = basePathMap[module] || basePathMap["finacle"];

  const JSON_PATH = `${basePath}/Schedule_Topics/daywise_topics.json`;
  const IMAGE_BASE = `${basePath}/Schedule_Images/`;


  /* -----------------------------------------
      LOAD JSON TOPICS
  ------------------------------------------ */
  useEffect(() => {
    fetch(JSON_PATH)
      .then((res) => res.json())
      .then((data) => setTopics(data))
      .catch(() => console.error("❌ JSON Load Failed:", JSON_PATH));
  }, []);

  /* -----------------------------------------
      CLOSE MOBILE POPUP ON OUTSIDE CLICK
  ------------------------------------------ */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        isMobile &&
        popupOpen &&
        popupRef.current &&
        !popupRef.current.contains(e.target)
      ) {
        setPopupOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [popupOpen, isMobile]);

  // (Note: earlier you had a duplicate of the above effect; keeping just one is fine)

  // Ensure popups close when drawer closes
  useEffect(() => {
    if (!drawerOpen) {
      setPopup1({ visible: false, day: null });
      setPopup2({ visible: false, day: null });
      // ensure hovering flag reset too
      setIsHoveringPopup(false);
      setHoverBubble(false);
      setHoverPopup1(false);
      setHoverPopup2(false);
      setShowOverlay(false);
    }
  }, [drawerOpen]);

  /* ========================================================================
      ⭐⭐ MOBILE VERSION — UNTOUCHED ⭐⭐
  ======================================================================== */
  if (isMobile) {
    return (
      <div
        ref={popupRef}
        className="position-fixed shadow-lg d-flex flex-column"
        style={{
          bottom: "0px",
          right: "32%",
          transform: "translateX(50%)",
          width: "60%",
          borderRadius: "12px 12px 0 0",
          border: `2px solid ${BRAND}`,
          background: "white",
          zIndex: 1050,
          transition: "height 0.4s ease",
          height: popupOpen ? "360px" : "60px",
        }}
      >
        {/* HEADER */}
        <div
          className="d-flex align-items-center justify-content-between px-3 py-2"
          style={{
            backgroundColor: "rgba(100,226,183,0.2)",
            borderBottom: popupOpen ? `2px solid ${BRAND}` : "none",
          }}
        >
          <span className="fw-bold" style={{ color: "#04352d", fontSize: "1rem" }}>
            Select Day
          </span>

          <button
            onClick={() => setPopupOpen(!popupOpen)}
            className="btn btn-sm border-0"
            style={{
              backgroundColor: BRAND,
              color: "#04352d",
              borderRadius: "6px",
              width: "28px",
              height: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i className={`bi ${popupOpen ? "bi-chevron-down" : "bi-chevron-up"} fs-6`}></i>
          </button>
        </div>

        {/* GRID FOR MOBILE */}
        <div
          className="p-3 flex-grow-1"
          style={{
            overflowY: popupOpen ? "auto" : "hidden",
            opacity: popupOpen ? 1 : 0,
            pointerEvents: popupOpen ? "auto" : "none",
            transition: "opacity 0.3s ease",
          }}
        >
          <div
            className="d-grid"
            style={{
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "10px",
            }}
          >
            {numbers.map((num) => {
              const isActive = activeDay === num;

              return (
                <div
                  key={num}
                  onClick={() => {
                    setActiveDay(num);
                    setSelectedDay(num);
                  }}
                  className="d-flex align-items-center justify-content-center fw-semibold"
                  style={{
                    height: "40px",
                    borderRadius: "8px",
                    border: `1.5px solid ${BRAND}`,
                    color: "#04352d",
                    backgroundColor: isActive ? BRAND : "rgba(100,226,183,0.1)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    userSelect: "none",
                  }}
                >
                  {num}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ========================================================================
      ⭐⭐ DESKTOP VERSION WITH SHADOWS AND POPUPS ⭐⭐
  ======================================================================== */

  /* --------------------------
      Popup 1 Position Logic
  --------------------------- */
  const showPopup1 = (day) => {
    const el = bubbleRefs.current[day];
    if (!el) return;

    const rect = el.getBoundingClientRect();

    setPopup1({
      visible: true,
      day,
      x: rect.left - 150,
      y: rect.top - 5,
    });
  };

  /* ------------ HIDE POPUPS ONLY WHEN ALL HOVERS ARE FALSE -----------
     (we rely on several hover flags so popups don't vanish mid-hover)
  ------------------------------------------------------------------ */
  const hidePopups = () => {
    if (!hoverBubble && !hoverPopup1 && !hoverPopup2 && !isHoveringPopup) {
      setPopup1({ visible: false, day: null });
      setPopup2({ visible: false, day: null });
      setShowOverlay(false);
    }
  };

  /* ----------------------------------------
      Shadow Logic (on scroll)
  ---------------------------------------- */
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;

    const atTop = el.scrollTop === 0;
    const atBottom = el.scrollHeight - el.scrollTop === el.clientHeight;

    setShowTopShadow(!atTop);
    setShowBottomShadow(!atBottom);
  };

  /* ----------------------------------------
      Attach Scroll Listener
  ---------------------------------------- */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

//  useEffect(() => {
//   const handleOutsideClick = (e) => {
//     if (
//       drawerOpen &&
//       drawerRef.current &&
//       !drawerRef.current.contains(e.target)
//     ) {
//       setDrawerOpen(false);
//       setOpenedByClick(false);
//     }
//   };

//   document.addEventListener("mousedown", handleOutsideClick);
//   return () => document.removeEventListener("mousedown", handleOutsideClick);
// }, [drawerOpen]);


useEffect(() => {
  const handleGlobalClick = (e) => {
    const clickedInsideDrawer =
      drawerRef.current?.contains(e.target);

    const clickedInsidePopup =
      popupRef.current?.contains(e.target);

    // 🔹 CASE 1: Popup is open → close ONLY popups
    if (popup1.visible || popup2.visible) {
      if (!clickedInsidePopup && !clickedInsideDrawer) {
        setPopup1({ visible: false, day: null });
        setPopup2({ visible: false, day: null });
        setPopupImages([]);
        setActiveImage(null);

        setHoverBubble(false);
        setHoverPopup1(false);
        setHoverPopup2(false);
        setIsHoveringPopup(false);
      }
      return; // ⛔ do NOT touch drawer
    }

    // 🔹 CASE 2: No popup → close drawer on outside click
    if (drawerOpen && !clickedInsideDrawer) {
      setDrawerOpen(false);
      setOpenedByClick(false);
    }
  };

  document.addEventListener("mousedown", handleGlobalClick);
  return () =>
    document.removeEventListener("mousedown", handleGlobalClick);
}, [drawerOpen, popup1.visible, popup2.visible]);





  /* --------------------------
      Desktop UI Return
  --------------------------- */
  return (
    <>
      {/* SIDE TAB */}
  {!drawerOpen && (
  <div
    ref={tabRef}
    onMouseEnter={(e) => {
      e.stopPropagation();
      setOpenedByClick(false);   // opened by hover
      setDrawerOpen(true);
    }}
    className="position-fixed d-flex align-items-center justify-content-center shadow btn-11"
    style={{
      top: "50%",
      right: "0px",
      transform: "translateY(-50%)",
      backgroundColor: BRAND,
      color: "#04352d",
      width: "20px",
      height: "120px",
      borderRadius: "10px 0 0 10px",
      cursor: "pointer",
      zIndex: 3000,
    }}
  >
    <ArrowBackIosNewIcon style={{ fontSize: "18px" }} />
  </div>
)}

   {/* RIGHT DRAWER */}
      <div
        ref={drawerRef}
        className="position-fixed d-flex flex-column"
        style={{
          top: 0,
          right: drawerOpen ? "0" : "-90px",
          width: "85px",
          height: "100vh",
          transition: "right 0.35s ease",
          zIndex: 2999,
          paddingTop: "97px",
          position: "relative",
        }}
      >
        {showTopShadow && (
          <div
            style={{
              position: "absolute",
              top: "97px",
              left: 0,
              width: "80%",
              height: "20px",
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.35), rgba(0,0,0,0))",
              pointerEvents: "none",
              zIndex: 22,
            }}
          ></div>
        )}

        {/* SCROLL */}
        <div
          ref={scrollRef}
          style={{
            overflowY: "auto",
            height: "calc(100vh - 120px)",
            paddingRight: "10px",
            position: "relative",
            zIndex: 10,
          }}
        >
          {numbers.map((num) => {
            const active = activeDay === num;

            return (
              <div
                key={num}
                ref={(el) => (bubbleRefs.current[num] = el)}
                onMouseEnter={() => {
                  setHoverBubble(true);
                  showPopup1(num);
                }}
                onMouseLeave={() => {
                  setHoverBubble(false);
                  setTimeout(() => hidePopups(), 80);
                }}
                onClick={() => {
                  setActiveDay(num);
                  setSelectedDay(num);
                }}
                className={`${active ? "day-static" : "day-animate"} d-flex align-items-center justify-content-center`}
                style={{
  width: "55px",
  height: "55px",
  borderRadius: "50%",
  border: `2px solid ${BRAND}`,
  marginBottom: "12px",
  cursor: "pointer",
  color: "#04352d",                         // ✅ visible
  backgroundColor: "rgba(100,226,183,0.15)",// ✅ visible
  fontWeight: 700,
}}

              >
                {num}
              </div>
            );
          })}
        </div>

        {showBottomShadow && (
          <div
            style={{
              position: "absolute",
              bottom: "24px",
              left: 0,
              width: "80%",
              height: "25px",
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.35))",
              pointerEvents: "none",
              zIndex: 22,
            }}
          ></div>
        )}
      </div>

      {/* POPUP 1 — Title */}
      {popup1.visible && topics[popup1.day] && (
        <div
          onMouseEnter={() => {
            setIsHoveringPopup(true); // kept for backward compatibility
            setHoverPopup1(true);
            setPopup2({ visible: true, day: popup1.day });
          }}
          onMouseLeave={() => {
            setIsHoveringPopup(false);
            setHoverPopup1(false);
            setTimeout(() => hidePopups(), 120);
          }}
          style={{
            position: "fixed",
            top: popup1.y,
            left: popup1.x - 100,
            width: "200px",
            background: "#c9f5e6ff",
            border: "2px solid #0a724fff",
            padding: "10px",
            borderRadius: "8px",
            boxShadow: "0 4px 10px rgba(0,0,0,0.25)",
            zIndex: 9999,
          }}
        >
          <strong>{topics[popup1.day].title}</strong>
        </div>
      )}

      {/* POPUP 2 — Image Only */}
      {/* POPUP 2 — Centered Large Image Modal */}
{/* POPUP 2 — Centered Large Image Modal */}
{popup2.visible && popupImages.length > 0 && (
  <>
    {/* Overlay */}
    <div
      onClick={() => {
        setPopup1({ visible: false, day: null });
        setPopup2({ visible: false, day: null });
        setPopupImages([]);
        setActiveImage(null);
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        zIndex: 9998,
      }}
    />

    {/* Image Modal */}
    <div
      onMouseEnter={() => setHoverPopup2(true)}
      onMouseLeave={() => {
        setHoverPopup2(false);
        setTimeout(() => hidePopups(), 120);
      }}
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "900px",
        height: "620px",
        background: "#fff",
        borderRadius: "14px",
        padding: "14px",
        boxShadow: "0 8px 25px rgba(0,0,0,0.35)",
        zIndex: 9999,
        overflow: "hidden",
      }}
    >
      {/* VERTICAL IMAGE SCROLLER — ONE BY ONE */}
      <div
        className="vertical-image-scroll"
        style={{
          height: "100%",
          overflowY: "auto",
        }}
      >
        {popupImages.map((img, index) => (
          <div
            key={index}
            style={{
              height: "100%",
              minHeight: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={img}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  </>
)}



    </>
  );
}
