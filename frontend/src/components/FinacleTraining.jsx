import React, { useState, useEffect, useRef } from "react";
import FinaclePopup from "./FinaclePopup";
import Image1 from "../images/Chatbot1.png";
import Image2 from "../images/full.png";
import { ChevronUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import rehypeRaw from "rehype-raw";
import PinPopup from "./PinPopup";
import FullScreenChatbot from "./FullScreenChatbot";

import {
  getPdfFiles,
  getDayFiles,
  listSessions,
  createSession,
  addMessageToSession,
  deleteSession,
  renameSession,
  loadSession,
  saveTempPair,
  globalSearch,
  getTempChatStatus,
  BACKEND_URL,
} from "../api/api";

export default function FinacleTraining() {
  /* ------------------------------------------------------------------
      CONSTANTS
  ------------------------------------------------------------------ */
  const ASSET_BASE = import.meta.env.VITE_ASSET_BASE || "";
  const BRAND = "#64E2B7";
  const PY_API = import.meta.env.VITE_PY_API || "http://192.168.1.100:8000";

  /* ------------------------------------------------------------------
      TEMP CHAT STORAGE BACKEND CONTROL
  ------------------------------------------------------------------ */
  const [tempReceiveEnabled, setTempReceiveEnabled] = useState(true);

  useEffect(() => {
    async function loadToggle() {
      try {
        const res = await getTempChatStatus();
        if (res && res.ok) {
          setTempReceiveEnabled(res.enabled);
        }
      } catch (err) {
        console.error("Failed to load temp chat status:", err);
      }
    }
    loadToggle();
  }, []);

  /* ------------------------------------------------------------------
      UI STATE
  ------------------------------------------------------------------ */
  const [chatbotOn, setChatbotOn] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dayLanguageMap] = useState({});
  const [activeTableUrl, setActiveTableUrl] = useState(null);
  const [activeImageUrl, setActiveImageUrl] = useState(null);


  /* ------------------------------------------------------------------
      FILES & VIEWER STATE
  ------------------------------------------------------------------ */
  const [pdfFiles, setPdfFiles] = useState([]);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayFiles, setDayFilesState] = useState({ pdfs: [], videos: [] });
  const [selectedDayPdf, setSelectedDayPdf] = useState("");
  const [selectedVideo, setSelectedVideo] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pdfPage, setPdfPage] = useState(1);
  const [videoTime, setVideoTime] = useState(0);
  const [videoLanguage, setVideoLanguage] = useState("english");
  const [showTablePopup, setShowTablePopup] = useState(false);
  const [showImagePopup, setShowImagePopup] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dayCount, setDayCount] = useState(60);
  const [fromSuggestion, setFromSuggestion] = useState(false);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false);
  const [mobileSessionMenuOpen, setMobileSessionMenuOpen] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  /* ------------------------------------------------------------------
      MODEL STATE (from old file)
  ------------------------------------------------------------------ */
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [countdown, setCountdown] = useState(70);
  const [timerActive, setTimerActive] = useState(false);
  const [currentImages, setCurrentImages] = useState([]);
  const [currentTables, setCurrentTables] = useState([]);

  /* ------------------------------------------------------------------
      INSTRUCTIONS SCREEN
  ------------------------------------------------------------------ */
  const [showInstructions, setShowInstructions] = useState(false);

  /* ------------------------------------------------------------------
      REFS
  ------------------------------------------------------------------ */
  const chatScrollRef = useRef(null);
  const pdfIframeRef = useRef(null);
  const messagesEndRef = useRef(null);
  const drawerRef = useRef(null);
  const savedMessagesRef = useRef(new Set());

  /* ------------------------------------------------------------------
      SESSIONS & MESSAGES
  ------------------------------------------------------------------ */
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  /* ------------------------------------------------------------------
      SESSION MENU/MODALS
  ------------------------------------------------------------------ */
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);
  const [renameId, setRenameId] = useState(null);
  const [renameText, setRenameText] = useState("");
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  const [showPinPopup, setShowPinPopup] = useState(false);
const [isVerified, setIsVerified] = useState(false);
const [showFullChatbot, setShowFullChatbot] = useState(false);
const [hover, setHover] = useState(false);

  /* ------------------------------------------------------------------
      CHAT INPUT
  ------------------------------------------------------------------ */
  const [input, setInput] = useState("");
  const [queryType, setQueryType] = useState("Quick");

  /* ------------------------------------------------------------------
      MOBILE RESIZE HANDLER
  ------------------------------------------------------------------ */
  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 768);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* ------------------------------------------------------------------
      HELPER FUNCTION FOR IMAGE URLS (from old file)
  ------------------------------------------------------------------ */
  const getImageUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    if (path.startsWith("/assets")) {
      const backendUrl = import.meta.env.VITE_PY_API || "http://192.168.1.100:8000";
      return backendUrl + path;
    }
    return path;
  };

  /* ------------------------------------------------------------------
      SIMPLE SPINNER COMPONENT (from old file)
  ------------------------------------------------------------------ */
  const SimpleSpinner = ({ size = 24, color = "#64e2b7" }) => {
    const px = typeof size === "number" ? `${size}px` : size;
    return (
      <div
        style={{
          width: px,
          height: px,
          border: `${Math.max(2, Math.round(size / 8))}px solid rgba(0,0,0,0.15)`,
          borderTop: `${Math.max(2, Math.round(size / 8))}px solid ${color}`,
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
    );
  };

  /* ------------------------------------------------------------------
      CHECK MODEL STATUS ON MOUNT (from old file)
  ------------------------------------------------------------------ */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${PY_API}/api/model_status`);
        if (res.ok) {
          const data = await res.json();
          setModelLoaded(Boolean(data.loaded));
        } else {
          setModelLoaded(false);
        }
      } catch (e) {
        console.warn("Model status check failed:", e);
        setModelLoaded(false);
      }
    })();
  }, []);

  /* ------------------------------------------------------------------
      LOAD MODELS FUNCTION (from old file)
  ------------------------------------------------------------------ */
  const loadModels = async () => {
    try {
      setLoadingModels(true);
      const res = await fetch(`${PY_API}/api/load_model`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to load models");
      }

      const data = await res.json();
      if (data?.status === "models_loaded" || data?.status === "ok") {
        setModelLoaded(true);
      } else {
        setModelLoaded(true);
      }
    } catch (err) {
      console.error("Error loading models:", err);
    } finally {
      setLoadingModels(false);
    }
  };

  /* ------------------------------------------------------------------
      LOAD SESSIONS ON MOUNT
  ------------------------------------------------------------------ */
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        let meta = await listSessions();
        if (!Array.isArray(meta)) meta = [];

        if (!mounted) return;
        setSessions(meta);

        if (!meta || meta.length === 0) {
          setShowInstructions(true);
          setCurrentSessionId(null);
          setMessages([]);
          return;
        } else {
          setShowInstructions(false);
        }

        const savedId = localStorage.getItem("lastSessionId");
        const exists = meta.find((m) => String(m.sessionId) === String(savedId));
        const sessionToLoad = exists ? exists.sessionId : meta[0].sessionId;

        setCurrentSessionId(sessionToLoad);

        const loaded = await loadSession(sessionToLoad);

        const reconstructedMessages = (loaded.messages || []).map(msg => {
          if (msg.sender === "bot") {
            // ✅ Try to parse stored arrays first
            let images = [];
            let tables = [];

            try {
              if (msg.allImages) images = JSON.parse(msg.allImages);
              else if (msg.image) images = [{ path: msg.image, type: "image", score: 1 }];
            } catch (e) {
              if (msg.image) images = [{ path: msg.image, type: "image", score: 1 }];
            }

            try {
              if (msg.allTables) tables = JSON.parse(msg.allTables);
              else if (msg.table) tables = [{ path: msg.table, type: "table", score: 1 }];
            } catch (e) {
              if (msg.table) tables = [{ path: msg.table, type: "table", score: 1 }];
            }

            return {
              ...msg,
              image: images.length > 0,
              table: tables.length > 0,
              images: images,
              tables: tables,
              loading_images: false
            };
          }
          return msg;
        });


        
        setMessages(reconstructedMessages);

      } catch (err) {
        console.error("Failed to load sessions:", err);
        setShowInstructions(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  /* ------------------------------------------------------------------
      AUTO-SCROLL FOR CHAT
  ------------------------------------------------------------------ */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ------------------------------------------------------------------
      SCHEDULE TAB CLICK HANDLER
  ------------------------------------------------------------------ */
  const handleScheduleTabClick = (e) => {
    e.stopPropagation();
    setDrawerOpen((prev) => !prev);
  };

  /* ------------------------------------------------------------------
      FETCH PDFS
  ------------------------------------------------------------------ */
  useEffect(() => {
    (async () => {
      try {
        const data = await getPdfFiles();
        setPdfFiles(data || []);
        if (Array.isArray(data) && data.length > 0) setSelectedPdfUrl(data[0].url);
      } catch (e) {
        console.error("Error fetching PDFs:", e);
      }
    })();
  }, []);

  /* ------------------------------------------------------------------
      SCROLL BUTTON TOGGLE
  ------------------------------------------------------------------ */
  useEffect(() => {
    const div = chatScrollRef.current;
    if (!div) return;

    const handleScroll = () => {
      const atBottom = Math.abs(div.scrollHeight - div.scrollTop - div.clientHeight) < 2;
      setShowScrollButton(!atBottom);
    };

    div.addEventListener("scroll", handleScroll);
    return () => div.removeEventListener("scroll", handleScroll);
  }, []);

  /* ------------------------------------------------------------------
      SAVE SINGLE MESSAGE TO SESSION
  ------------------------------------------------------------------ */
  const saveToCurrentSession = async (msg) => {
    if (!currentSessionId) return;
    try {
      await addMessageToSession(currentSessionId, msg);
    } catch (err) {
      console.error("Failed saving message:", err);
    }
  };

  /* ------------------------------------------------------------------
      VIDEO LANGUAGE CHANGE HANDLER
  ------------------------------------------------------------------ */
  useEffect(() => {
    if (!dayFiles.videos) return;

    const langVideos = dayFiles.videos[videoLanguage] || [];

    if (langVideos.length > 0) {
      setSelectedVideo(langVideos[0].url);
    } else {
      setSelectedVideo("");
    }
  }, [videoLanguage, dayFiles]);

  /* ------------------------------------------------------------------
      COUNTDOWN TIMER LOGIC (from old file)
  ------------------------------------------------------------------ */
  useEffect(() => {
    if (!timerActive) return;

    if (countdown <= 0) {
      setTimerActive(false);
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive, countdown]);

  // /* ------------------------------------------------------------------
  //     FETCH IMAGES IN BACKGROUND (from old file)
  // ------------------------------------------------------------------ */
  // const fetchImagesInBackground = async (answerText, queryText, sources, userTextOnly, fromSuggestionFlag) => {
  //   try {
  //     const sourcePdfs = sources
  //       ? [...new Set(sources.map((s) => s.pdf_name).filter(Boolean))]
  //       : [];

  //     const res = await fetch(`${PY_API}/api/get_images`, {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         answer_text: answerText,
  //         query_text: queryText,
  //         source_pdfs: sourcePdfs,
  //         top_k: 3,
  //       }),
  //     });

  //     if (!res.ok) return;
  //     const data = await res.json();

  //     const images =
  //       data.supporting_images?.filter(
  //         (img) =>
  //           img.type === "image" ||
  //           img.type === "flowchart" ||
  //           img.type === "line_diagram"
  //       ) || [];
  //     const tables =
  //       data.supporting_images?.filter((img) => img.type === "table") || [];

  //     // ✅ Store for popup
  //     if (images.length > 0) setCurrentImages(images);
  //     if (tables.length > 0) setCurrentTables(tables);

  //     // ✅ Update messages state
  //     setMessages((prev) => {
  //       const updated = [...prev];
  //       const lastBotIdx =
  //         updated.length - 1 - (updated[updated.length - 1]?.sender === "system" ? 1 : 0);

  //       if (lastBotIdx >= 0 && updated[lastBotIdx]?.sender === "bot") {
  //         const updatedMsg = {
  //           ...updated[lastBotIdx],
  //           image: images.length > 0,
  //           table: tables.length > 0,
  //           images: images,
  //           tables: tables,
  //           loading_images: false,
  //         };

  //         updated[lastBotIdx] = updatedMsg;

  //         // ✅ SAVE TO SESSION (ONCE, with first image/table for storage)
  //         const messageKey = `${currentSessionId}-${lastBotIdx}-${updatedMsg.text.substring(0, 50)}`;
          
  //         if (!savedMessagesRef.current.has(messageKey)) {
  //           savedMessagesRef.current.add(messageKey);
            
  //           saveToCurrentSession({
  //             sender: "bot",
  //             text: updatedMsg.text,
  //             table: tables.length > 0 ? tables[0].path : null,
  //             image: images.length > 0 ? images[0].path : null,
  //             allTables: JSON.stringify(tables),
  //             allImages: JSON.stringify(images)
  //           });
  //         }

  //         // ✅ SAVE TO TEMP CHAT (with ALL images/tables)
  //         if (tempReceiveEnabled && !fromSuggestionFlag && !updated[lastBotIdx]._tempSaved) {
  //           saveTempPair(userTextOnly, {
  //             text: updatedMsg.text,
  //             table: tables[0]?.path || null,
  //             image: images[0]?.path || null,
  //             tables,
  //             images
  //           });

  //           updated[lastBotIdx]._tempSaved = true;
  //         }
  //       }

  //       return updated;
  //     });

  //   } catch (err) {
  //     console.error("Background image fetch failed:", err);
  //   }
  // };


  // /* ------------------------------------------------------------------
  //     SEND MESSAGE (MERGED LOGIC)
  // ------------------------------------------------------------------ */
  // const handleSend = async () => {
  //   setFromSuggestion(false);
  //   const text = input?.trim();
  //   if (!text) return;

  //   const userMsg = {
  //     sender: "user",
  //     text: `(${queryType}) ${text}`,
  //   };

  //   setMessages((prev) => [...prev, userMsg]);
  //   saveToCurrentSession(userMsg);

  //   const userTextOnly = text;
  //   setInput("");

  //   // Start timer
  //   setCountdown(70);
  //   setTimerActive(true);

  //   // Add loader flag
  //   setMessages((prev) => [...prev, { sender: "bot", loading: true, _isPlaceholder: true }]);

  //   const payload = { message: text, top_k: 5, mode: queryType || "Quick" };

  //   try {
  //     const res = await fetch(`${PY_API}/api/chat`, {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify(payload),
  //     });

  //     if (!res.ok) {
  //       const errText = await res.text();
  //       throw new Error(errText || "LLM backend error");
  //     }

  //     const data = await res.json();

  //     // Stop timer
  //     setTimerActive(false);

  //     // Display answer IMMEDIATELY
  //     setMessages((prev) => {
  //       const withoutInterim = prev.filter((m) => !m._isPlaceholder);

  //       const out = [
  //         ...withoutInterim,
  //         {
  //           sender: "bot",
  //           text: data.answer || "No answer returned.",
  //           image: false,
  //           table: false,
  //           images: [],
  //           tables: [],
  //           loading_images: true,
  //           _saved: false
  //         },
  //       ];

  //       if (data.sources?.length) {
  //         out.push({
  //           sender: "system",
  //           text: "Sources:",
  //           sources: data.sources,
  //         });
  //       }

  //       return out;
  //     });

  //     // Fetch images in BACKGROUND
  //     fetchImagesInBackground(data.answer, text, data.sources || [], userTextOnly, fromSuggestion);
  //   } catch (err) {
  //     console.error("Chat error:", err);

  //     setTimerActive(false);


  //     setMessages((prev) =>
  //       prev.map((m) =>
  //         m._isPlaceholder
  //           ? {
  //               sender: "bot",
  //               text: data.answer || "No answer returned.",
  //               image: false,
  //               table: false,
  //               images: [],
  //               tables: [],
  //               loading_images: true
  //             }
  //           : m
  //       )
  //     );      

  //   }
  // };

/* ------------------------------------------------------------------
    SEND MESSAGE (MERGED LOGIC) — FIXED
------------------------------------------------------------------ */
const handleSend = async () => {
  setFromSuggestion(false);
  const text = input?.trim();
  if (!text) return;

  const userMsg = {
    sender: "user",
    text: `(${queryType}) ${text}`,
  };

  setMessages((prev) => [...prev, userMsg]);
  saveToCurrentSession(userMsg);

  const userTextOnly = text;
  setInput("");

  // Start timer
  setCountdown(70);
  setTimerActive(true);

  // Add placeholder loader
  setMessages((prev) => [
    ...prev,
    { sender: "bot", loading: true, _isPlaceholder: true },
  ]);

  const payload = {
    message: text,
    top_k: 5,
    mode: queryType || "Quick",
  };

  try {
    const res = await fetch(`${PY_API}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || "LLM backend error");
    }

    const data = await res.json();

    // Stop timer
    setTimerActive(false);

    // ✅ USE IMAGES RETURNED BY /api/chat
    setMessages((prev) => {
      const withoutInterim = prev.filter((m) => !m._isPlaceholder);

      const supporting = data.supporting_images || [];

      const images = supporting.filter(
        (img) =>
          img.type === "image" ||
          img.type === "flowchart" ||
          img.type === "line_diagram"
      );

      const tables = supporting.filter((img) => img.type === "table");

      const botMsg = {
        sender: "bot",
        text: data.answer || "No answer returned.",
        image: images.length > 0,
        table: tables.length > 0,
        images: images,
        tables: tables,
        loading_images: false,
        _saved: true,
      };

      const alreadyExists = withoutInterim.some(
        (m) => m.sender === "bot" && m.text === botMsg.text
      );

      const out = alreadyExists
        ? withoutInterim
        : [...withoutInterim, botMsg];

      if (data.sources?.length) {
        out.push({
          sender: "system",
          text: "Sources:",
          sources: data.sources,
        });
      }

      // ✅ SAVE TO SESSION (ONLY ONCE using unique key)
      const messageKey = `${currentSessionId}-bot-${botMsg.text.trim()}`;

      if (!savedMessagesRef.current.has(messageKey)) {
        savedMessagesRef.current.add(messageKey);
        
        saveToCurrentSession({
          sender: "bot",
          text: botMsg.text,
          table: tables.length > 0 ? tables[0].path : null,
          image: images.length > 0 ? images[0].path : null,
          allTables: JSON.stringify(tables),
          allImages: JSON.stringify(images),
        });
      }


      // ✅ SAVE TO TEMP CHAT (if enabled and not from suggestion)
      if (tempReceiveEnabled && !fromSuggestion) {
        saveTempPair(userTextOnly, {
          text: botMsg.text,
          table: tables[0]?.path || null,
          image: images[0]?.path || null,
          tables: tables,
          images: images,
        });
      }
      return out;
    });


  } catch (err) {
    console.error("Chat error:", err);
    setTimerActive(false);

    setMessages((prev) =>
      prev.map((m) =>
        m._isPlaceholder
          ? {
              sender: "bot",
              text: "Something went wrong. Please try again.",
              image: false,
              table: false,
              images: [],
              tables: [],
              loading_images: false,
            }
          : m
      )
    );
  }
};


  /* ------------------------------------------------------------------
      SEND FROM SUGGESTION
  ------------------------------------------------------------------ */


const handleSendFromSuggestion = async (question, aiObj) => {
  const userMsg = { sender: "user", text: question };

  // ✅ Properly reconstruct images/tables arrays
  const images = aiObj.images || (aiObj.image ? [{ path: aiObj.image, type: "image", score: 1 }] : []);
  const tables = aiObj.tables || (aiObj.table ? [{ path: aiObj.table, type: "table", score: 1 }] : []);

  const botMsg = {
    sender: "bot",
    text: aiObj.text,
    table: aiObj.table || null,
    image: aiObj.image || null,
    images: images,
    tables: tables,
    loading_images: false
  };

  setMessages((prev) => [...prev, userMsg, botMsg]);

  await saveToCurrentSession(userMsg);

  // // Save to session
  // await saveToCurrentSession(userMsg);
  // await saveToCurrentSession({
  //   sender: "bot",
  //   text: aiObj.text,
  //   table: aiObj.tables?.[0]?.path || null,
  //   image: aiObj.images?.[0]?.path || null,
  //   allTables: JSON.stringify(aiObj.tables || []),
  //   allImages: JSON.stringify(aiObj.images || [])
  // });  

  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
};


  /* ------------------------------------------------------------------
      DAY SELECTION
  ------------------------------------------------------------------ */
  const handleSelectDay = async (day) => {
    setSelectedDay(day);
    setChatbotOn(false);

    const langForThisDay = dayLanguageMap[day] || "english";
    setVideoLanguage(langForThisDay);

    try {
      const data = await getDayFiles(day);
      setDayFilesState(data);

      if (data.pdfs?.length > 0) setSelectedDayPdf(data.pdfs[0].url);
      else setSelectedDayPdf("");

      const langVideos = data.videos?.[langForThisDay] || [];
      if (langVideos.length > 0) {
        setSelectedVideo(langVideos[0].url);
      } else {
        setSelectedVideo("");
      }
    } catch (err) {
      console.error("Error fetching day files:", err);
      setSelectedDayPdf("");
      setSelectedVideo("");
    }
  };

  /* ------------------------------------------------------------------
      FETCH MAX DAY COUNT
  ------------------------------------------------------------------ */
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/finacle/max-day`)
      .then((res) => res.json())
      .then((data) => {
        if (data.maxDay && data.maxDay > 60) {
          setDayCount(data.maxDay);
        }
      })
      .catch(() => {
        setDayCount(60);
      });
  }, []);

  /* ------------------------------------------------------------------
      SESSION MANAGEMENT
  ------------------------------------------------------------------ */
  const addSession = async () => {
    if (sessions.length >= 5) return;

    try {
      await createSession();
      const updated = await listSessions();
      setSessions(updated || []);

      if (showInstructions) setShowInstructions(false);

      if (updated && updated.length > 0) {
        const last = updated[updated.length - 1];
        setCurrentSessionId(last.sessionId);
        setMessages([]);
        savedMessagesRef.current.clear();
        localStorage.setItem("lastSessionId", last.sessionId);
      }
    } catch (e) {
      console.error("Error creating session:", e);
    }
  };


  const switchToSession = async (id) => {
    try {
      setCurrentSessionId(id);
      savedMessagesRef.current.clear();
      setShowInstructions(false);
      localStorage.setItem("lastSessionId", id);

      const loaded = await loadSession(id);

      // ✅ Reconstruct messages SAFELY from session JSON
      const reconstructedMessages = (loaded.messages || []).map((msg) => {
        // USER messages – leave untouched
        if (msg.sender !== "bot") {
          return msg;
        }

        let images = [];
        let tables = [];

        // 🔒 ONLY trust array-based storage (allImages / allTables)
        // 🔥 DO NOT fallback aggressively to msg.image/msg.table
        // because that causes 3 → 1 loss after refresh

        try {
          if (msg.allImages) {
            const parsed = JSON.parse(msg.allImages);
            if (Array.isArray(parsed)) images = parsed;
          }
        } catch (e) {
          console.warn("Failed to parse allImages:", e);
        }

        try {
          if (msg.allTables) {
            const parsed = JSON.parse(msg.allTables);
            if (Array.isArray(parsed)) tables = parsed;
          }
        } catch (e) {
          console.warn("Failed to parse allTables:", e);
        }

        // ⚠️ BACKWARD COMPATIBILITY (OLD SESSIONS ONLY)
        // Only use single image/table IF arrays are missing
        if (images.length === 0 && msg.image) {
          images = [{ path: msg.image, type: "image", score: 1 }];
        }

        if (tables.length === 0 && msg.table) {
          tables = [{ path: msg.table, type: "table", score: 1 }];
        }

        return {
          ...msg,
          image: images.length > 0,
          table: tables.length > 0,
          images,
          tables,
          loading_images: false,

          _saved: true,
          _tempSaved: true
        };
      });

      setMessages(reconstructedMessages);
      savedMessagesRef.current.clear();

      setMenuOpen(null);
      setRenameId(null);

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    } catch (e) {
      console.error("Failed switching session:", e);
    }
  };

  const requestDelete = (id) => {
    setConfirmDeleteId(id);
    setMenuOpen(null);
    setRenameId(null);
  };

  const cancelDelete = () => setConfirmDeleteId(null);

  const confirmDelete = async (id) => {
    try {
      await deleteSession(id);
      const updated = await listSessions();
      setSessions(updated || []);

      if (!updated || updated.length === 0) {
        setCurrentSessionId(null);
        setMessages([]);
        setShowInstructions(true);
        localStorage.removeItem("lastSessionId");
      } else {
        const newActive = updated[updated.length - 1];
        setCurrentSessionId(newActive.sessionId);
        const loaded = await loadSession(newActive.sessionId);
        setMessages(Array.isArray(loaded.messages) ? loaded.messages : []);
        localStorage.setItem("lastSessionId", newActive.sessionId);
      }
    } catch (e) {
      console.error("Delete failed:", e);
      const refreshed = await listSessions();
      setSessions(refreshed || []);
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const openRename = (id, currentName) => {
    setRenameId(id);
    setRenameText(currentName || "");
    setMenuOpen(null);
  };

  const saveRename = async (id) => {
    const trimmed = renameText.trim();
    if (!trimmed) {
      setRenameId(null);
      return;
    }

    try {
      const res = await renameSession(id, trimmed);
      if (res && res.success) {
        setSessions((prev) =>
          prev.map((s) =>
            String(s.sessionId) === String(id) ? { ...s, name: trimmed } : s
          )
        );
      } else {
        const refreshed = await listSessions();
        setSessions(refreshed || []);
      }
    } catch (err) {
      console.error("Rename failed:", err);
      const refreshed = await listSessions();
      setSessions(refreshed || []);
    } finally {
      setRenameId(null);
    }
  };

  const toggleMenu = (id) => {
    setMenuOpen((prev) => (prev === id ? null : id));
    setRenameId(null);
  };

  const openMenuFor = (e, sessionId) => {
    e.stopPropagation();
    const rect = e.target.getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 8, left: rect.left - 110 });
    toggleMenu(sessionId);
  };

  /* ------------------------------------------------------------------
      TOGGLE DRAWER
  ------------------------------------------------------------------ */
  const handleToggleDrawer = () => setDrawerOpen((p) => !p);

  /* ------------------------------------------------------------------
      CLICK OUTSIDE DRAWER
  ------------------------------------------------------------------ */
  useEffect(() => {
    function handleClickOutside(e) {
      if (drawerOpen && drawerRef.current && !drawerRef.current.contains(e.target)) {
        setDrawerOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [drawerOpen]);

  /* ------------------------------------------------------------------
      MAIN UI RENDER
  ------------------------------------------------------------------ */
  return (
    <div
      className="position-relative"
      style={{
        minHeight: "100vh",
        backgroundColor: "#f8fdfb",
        overflow: "hidden",
      }}
    >
      {/* Spinner Keyframe Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes chatbotJump {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .chatbot-bounce {
          animation: chatbotJump 2s ease-in-out infinite;
          transition: transform 0.2s ease;
        }
        .chatbot-bounce:hover {
          transform: scale(1.08);
        }
      `}</style>

      {/* ======================================================================
        INSTRUCTIONS SCREEN
      ====================================================================== */}
      {showInstructions && (
        <div
          style={{
            marginTop: "120px",
            textAlign: "center",
            padding: "20px",
            color: "#04352d",
          }}
        >
          <h1 style={{ fontSize: "2rem", fontWeight: "800" }}>
            Welcome to Finacle Training Assistant
          </h1>

          <p style={{ fontSize: "1.15rem", marginTop: "20px" }}>
            Here's how to use this learning assistant:
          </p>

          <div
            style={{
              width: "80%",
              maxWidth: "650px",
              margin: "25px auto",
              padding: "25px",
              background: "#ffffff",
              borderRadius: "12px",
              boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
              textAlign: "left",
              fontSize: "1.1rem",
              lineHeight: "1.75",
            }}
          >
            <ul style={{ paddingLeft: "20px" }}>
              <li>➕ Click <b>Add Session</b> to start your first chat.</li>
              <li>⚡ Choose <b>Quick</b> or <b>Deep</b> mode for responses.</li>
              <li>📘 Use the <b>Schedule</b> tab to view PDFs & videos.</li>
              <li>💬 Each session saves your chat separately.</li>
              <li>🛠 Rename or delete sessions anytime.</li>
            </ul>
          </div>

          <p style={{ marginTop: "18px", opacity: 0.7 }}>Click ➕ to begin.</p>
        </div>
      )}

      {/* ======================================================================
        CHAT & STUDY SECTION
      ====================================================================== */}
      {!showInstructions && (
        <div
          className="chat-section d-flex flex-column position-fixed"
          style={{
            top: "76px",
            left: "50%",
            transform: "translateX(-50%)",
            width: chatbotOn ? "100%" : "100vw",
            maxWidth: chatbotOn ? "930px" : "100vw",
            zIndex: 900,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            height: "calc(100dvh - 150px)",
            overflowY: "auto",
            transition: "none",
            borderRadius: chatbotOn ? "10px" : "0px",
          }}
        >
          {chatbotOn ? (
            <div
              ref={chatScrollRef}
              className="overflow-auto w-100 chat-scroll-hide"
              style={{
                flexGrow: 1,
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                padding: "0 10px",
                height: "100%",
                overflowY: "auto",
              }}
            >
              {/* Scroll to bottom button */}
              {showScrollButton && (
                <div
                  onClick={() => {
                    if (chatScrollRef.current) {
                      chatScrollRef.current.scrollTo({
                        top: chatScrollRef.current.scrollHeight,
                        behavior: "smooth",
                      });
                    }
                  }}
                  style={{
                    position: "fixed",
                    bottom: "30px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "#ffffff",
                    width: "45px",
                    height: "45px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    zIndex: 5000,
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#222"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <polyline points="19 12 12 19 5 12"></polyline>
                  </svg>
                </div>
              )}

              {/* CHAT MESSAGES */}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: msg.sender === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      backgroundColor:
                        msg.sender === "user"
                          ? BRAND
                          : msg.sender === "system"
                          ? "transparent"
                          : "rgba(100,226,183,0.15)",
                      color: "#04352d",
                      padding: msg.sender === "system" ? "5px 10px" : "10px 16px",
                      borderRadius:
                        msg.sender === "user"
                          ? "16px 16px 0 16px"
                          : msg.sender === "system"
                          ? "8px"
                          : "16px 16px 16px 0",
                      maxWidth: msg.sender === "system" ? "90%" : "75%",
                      fontSize: msg.sender === "system" ? "0.85rem" : "0.95rem",
                      lineHeight: "1.45",
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                      marginBottom: "1px",
                    }}
                  >
                    {/* 🔥 1. If message is loading, show live loader */}
                    {msg.loading ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                          }}
                        >
                          <SimpleSpinner size={22} color="#1a9e72ff" />
                          <span>Thinking...</span>
                        </div>
                      </div>
                    ) : msg.sender === "user" ? (
                      <div style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>
                    ) : msg.sender === "system" ? (
                      <div style={{ fontSize: "12px", color: "#555" }}>
                        <strong>{msg.text}</strong>
                        {msg.sources &&
                          msg.sources.map((s, idx) => (
                            <div key={idx} style={{ marginTop: "4px" }}>
                              • {s.pdf_name || s.source}{" "}
                              {s.page ? `(page ${s.page})` : ""}
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div style={{ whiteSpace: "normal" }}>
                        <ReactMarkdown
                          children={msg.text}
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeRaw]}
                          components={{
                            code({ node, inline, className, children, ...props }) {
                              const match = /language-(\w+)/.exec(className || "");
                              return !inline && match ? (
                                <SyntaxHighlighter
                                  style={oneDark}
                                  language={match[1]}
                                  PreTag="div"
                                  {...props}
                                >
                                  {String(children).replace(/\n$/, "")}
                                </SyntaxHighlighter>
                              ) : (
                                <code
                                  style={{
                                    background: "#f5f5f5",
                                    padding: "2px 6px",
                                    borderRadius: 4,
                                    fontSize: 13,
                                  }}
                                  {...props}
                                >
                                  {children}
                                </code>
                              );
                            },
                            a({ node, ...props }) {
                              return (
                                <a {...props} target="_blank" rel="noreferrer" />
                              );
                            },
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* TABLE / IMAGE BUTTONS FOR BOT ONLY */}
                  {msg.sender === "bot" &&
                    (msg.loading_images || msg.image || msg.table) && (
                      <div
                        style={{
                          display: "flex",
                          gap: "12px",
                          marginTop: "8px",
                          alignItems: "center",
                        }}
                      >
                        {/* Show spinner while loading images */}
                        {msg.loading_images && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              color: "#666",
                              fontSize: "0.85rem",
                              fontStyle: "italic",
                            }}
                          >
                            <SimpleSpinner size={16} color="#64E2B7" />
                            <span>Loading images...</span>
                          </div>
                        )}

                        {/* TABLE button - only show when loaded */}
                        {!msg.loading_images && msg.table && (
                          <button
                            onClick={() => {
                              setCurrentTables(msg.tables || []);
                              setShowTablePopup(true);
                            }}
                            style={{
                              border: "2px solid #64E2B7",
                              background: "#fff",
                              borderRadius: "50px",
                              padding: "6px 12px",
                              fontSize: "0.85rem",
                              color: "#04352d",
                              fontWeight: 600,
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                          >
                            TABLE
                          </button>
                        )}

                        {/* IMAGE button - only show when loaded */}
                        {!msg.loading_images && msg.image && (
                          <button
                            onClick={() => {
                              setCurrentImages(msg.images || []);
                              setShowImagePopup(true);
                            }}
                            style={{
                              border: "2px solid #64E2B7",
                              background: "#fff",
                              borderRadius: "50px",
                              padding: "6px 12px",
                              fontSize: "0.85rem",
                              color: "#04352d",
                              fontWeight: 600,
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                          >
                            IMAGE
                          </button>
                        )}
                      </div>
                    )}
                </div>
              ))}

              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div
              className="d-flex flex-column align-items-center w-100"
              style={{
                backgroundColor: "#f9fbfa",
                minHeight: "100vh",
              }}
            >
              <h2
                className="fw-bold mb-4"
                style={{
                  color: "#04352d",
                  fontSize: "1.8rem",
                  borderBottom: `3px solid ${BRAND}`,
                  paddingBottom: "8px",
                }}
              >
                Day {selectedDay} – Study Materials
              </h2>

              {/* PDFs */}
              <div
                style={{
                  backgroundColor: "#fff",
                  borderRadius: "12px",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                  width: "100%",
                  maxWidth: "1100px",
                  padding: "25px 30px",
                  marginBottom: "40px",
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
                      style={{
                        width: "100%",
                        borderRadius: "10px",
                        border: `2px solid ${BRAND}`,
                      }}
                    >
                      {dayFiles.pdfs.map((pdf, idx) => (
                        <option key={idx} value={pdf.url}>
                          {pdf.title}
                        </option>
                      ))}
                    </select>

                    <div
                      style={{
                        position: isFullscreen ? "fixed" : "relative",
                        top: isFullscreen ? 0 : "auto",
                        left: isFullscreen ? 0 : "auto",
                        right: isFullscreen ? 0 : "auto",
                        bottom: isFullscreen ? 0 : "auto",
                        width: isFullscreen ? "100vw" : "100%",
                        height: isFullscreen ? "100vh" : "80vh",
                        backgroundColor: "#fff",
                        borderRadius: isFullscreen ? "0" : "10px",
                        overflow: "hidden",
                        zIndex: isFullscreen ? 99999999 : "auto",
                        boxShadow: isFullscreen
                          ? "none"
                          : "0 3px 10px rgba(0,0,0,0.1)",
                        transition: "all 0.3s ease-in-out",
                      }}
                    >
                      <iframe
                        ref={pdfIframeRef}
                        key={selectedDayPdf}
                        src={`${ASSET_BASE}${selectedDayPdf}#toolbar=0&navpanes=0&scrollbar=0&page=${pdfPage}`}
                        width="100%"
                        height="100%"
                        style={{ border: "none", backgroundColor: "#fff" }}
                      />

                      <button
                        onClick={() => setIsFullscreen((prev) => !prev)}
                        style={{
                          position: "absolute",
                          top: "15px",
                          right: "15px",
                          background: "rgba(255,255,255,0.9)",
                          border: "1px solid #ccc",
                          borderRadius: "8px",
                          padding: "6px",
                          cursor: "pointer",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                          zIndex: 10000,
                          transition: "transform 0.3s ease",
                        }}
                        title={
                          isFullscreen ? "Exit Fullscreen" : "View Fullscreen"
                        }
                      >
                        <img
                          src={Image2}
                          alt="Toggle Fullscreen"
                          style={{
                            width: "22px",
                            height: "22px",
                            transform: isFullscreen ? "rotate(180deg)" : "none",
                            transition: "transform 0.3s ease",
                          }}
                        />
                      </button>
                    </div>
                  </>
                ) : (
                  <p>No PDFs available for this day.</p>
                )}
              </div>

              {/* Videos */}
              <div
                style={{
                  backgroundColor: "#fff",
                  borderRadius: "12px",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                  width: "100%",
                  maxWidth: "1100px",
                  padding: "25px 30px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "15px",
                  }}
                >
                  <h4 className="fw-semibold" style={{ color: "#04352d" }}>
                    Videos:
                  </h4>

                  <select
                    value={videoLanguage}
                    onChange={(e) => setVideoLanguage(e.target.value)}
                    className="form-select"
                    style={{
                      width: "160px",
                      borderRadius: "8px",
                      border: `2px solid ${BRAND}`,
                    }}
                  >
                    <option value="english">English</option>
                    <option value="tamil">Tamil</option>
                    <option value="telugu">Telugu</option>
                    <option value="kannada">Kannada</option>
                  </select>
                </div>

                {dayFiles.videos?.[videoLanguage]?.length > 0 ? (
                  <>
                    <select
                      value={selectedVideo}
                      onChange={(e) => setSelectedVideo(e.target.value)}
                      className="form-select mb-4"
                      style={{
                        width: "100%",
                        borderRadius: "10px",
                        border: `2px solid ${BRAND}`,
                      }}
                    >
                      {dayFiles.videos[videoLanguage].map((vid, idx) => (
                        <option key={idx} value={vid.url}>
                          {vid.title}
                        </option>
                      ))}
                    </select>

                    <div
                      style={{
                        width: "100%",
                        height: "550px",
                        borderRadius: "12px",
                        background: "#000",
                        overflow: "hidden",
                      }}
                    >
                      <video
                        key={selectedVideo}
                        src={selectedVideo}
                        controls
                        controlsList="nodownload"
                        disablePictureInPicture
                        onTimeUpdate={(e) => setVideoTime(e.target.currentTime)}
                        onLoadedMetadata={(e) => {
                          e.target.currentTime = videoTime;
                        }}
                        width="100%"
                        height="100%"
                        style={{ objectFit: "contain" }}
                      />
                    </div>
                  </>
                ) : (
                  <p>No videos available.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================================
        GLOBAL PROGRESS BAR (above input box)
      ====================================================================== */}
      {timerActive && (
        <div
          style={{
            width: "100%",
            maxWidth: "200px",
            height: "8px",
            backgroundColor: "#e0ffe9",
            borderRadius: "10px",
            overflow: "hidden",
            border: "1px solid #94e2b7",
            position: "fixed",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: "75px",
            zIndex: 2000,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${(countdown / 70) * 100}%`,
              backgroundColor: "#64e2b7",
              transition: "width 1s linear",
            }}
          />
        </div>
      )}

      {/* ======================================================================
        CHAT INPUT BAR
      ====================================================================== */}
      {chatbotOn && !showInstructions && (
        <div
          className="chat-input-bar position-fixed d-flex align-items-start"
          style={{
            bottom: "10px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: "930px",
            backgroundColor: "#f8f9fa",
            borderRadius: "35px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
            padding: "10px 16px",
            zIndex: 1200,
          }}
        >
          {/* -------------------- LOAD MODELS BUTTON -------------------- */}
          {!modelLoaded && (
            <button
              onClick={loadModels}
              disabled={loadingModels}
              style={{
                marginRight: "10px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                borderRadius: "20px",
                border: "none",
                backgroundColor: loadingModels ? "#e6f7ef" : "#64E2B7",
                color: "#04352d",
                fontWeight: 700,
                cursor: loadingModels ? "default" : "pointer",
                boxShadow: "0 3px 8px rgba(0,0,0,0.08)",
              }}
            >
              {loadingModels ? (
                <>
                  <SimpleSpinner size={18} color="#04352d" />
                  <span style={{ fontSize: 14 }}>Loading...</span>
                </>
              ) : (
                <span style={{ fontSize: 14 }}>Load Models</span>
              )}
            </button>
          )}

          <textarea
            value={input}
            onChange={async (e) => {
              const text = e.target.value;
              setInput(text);

              /* Auto-resize */
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;

              /* If less than 2 characters → hide suggestions */
              if (text.length < 2) {
                setShowSuggestions(false);
                setSuggestions([]);
                return;
              }

              /* 🔍 Call backend global search */
              try {
                const res = await globalSearch(text);
                if (res.ok && res.results.length > 0) {
                  setSuggestions(res.results);
                  setShowSuggestions(true);
                } else {
                  setSuggestions([]);
                  setShowSuggestions(false);
                }
              } catch (err) {
                console.error("Suggestion load failed:", err);
                setSuggestions([]);
                setShowSuggestions(false);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
                e.target.style.height = "40px";
                setShowSuggestions(false);
              }
            }}
            placeholder="Ask anything..."
            rows={1}
            className="border-0 shadow-none bg-transparent flex-grow-1"
            style={{
              fontSize: "1rem",
              color: "#04352d",
              resize: "none",
              outline: "none",
              minHeight: "40px",
              maxHeight: "150px",
              padding: "8px 10px",
            }}
          />

          {/* ⭐ Suggestion Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              style={{
                position: "absolute",
                bottom: "70px",
                left: "40px",
                width: "90%",
                background: "#f3fffa",
                border: "1px solid #ccc",
                borderRadius: "10px",
                maxHeight: "200px",
                overflowY: "auto",
                zIndex: 9999,
                padding: "8px",
                boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
              }}
            >
              {suggestions.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setFromSuggestion(true);
                    setShowSuggestions(false);
                    handleSendFromSuggestion(item.user, item.ai);
                    setInput("");
                    setSuggestions([]);
                  }}
                  style={{
                    padding: "8px",
                    cursor: "pointer",
                    borderBottom: "1px solid #eee",
                    fontSize: "0.95rem",
                    fontWeight: 500,
                    color: "#04352d",
                  }}
                >
                  {item.user}
                </div>
              ))}
            </div>
          )}

          <div style={{ position: "relative", display: "inline-block" }}>
            <select
              value={queryType}
              onChange={(e) => setQueryType(e.target.value)}
              style={{
                borderRadius: "25px",
                border: "2px solid #64E2B7",
                color: "#04352d",
                backgroundColor: "#ffffff",
                padding: "10px 18px",
                paddingRight: "40px",
                marginRight: "10px",
                fontWeight: 600,
                cursor: "pointer",
                appearance: "none",
                width: window.innerWidth <= 768 ? "130px" : "180px",
              }}
            >
              <option value="">Choose Search Mode</option>
              <option value="Quick">Quick Response</option>
              <option value="Deep">Deep Reasoning</option>
            </select>

            <ChevronUp
              size={18}
              color="#04352d"
              style={{
                position: "absolute",
                right: "27px",
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
              }}
            />
          </div>

          <button
            onClick={handleSend}
            className="btn border-0"
            style={{
              backgroundColor: "#64E2B7",
              color: "#04352d",
              borderRadius: "50%",
              width: "42px",
              height: "42px",
              fontSize: "1.2rem",
            }}
          >
            ➤
          </button>
        </div>
      )}

      {/* ======================================================================
        SESSION TABS + MENU - DESKTOP
      ====================================================================== */}
      {chatbotOn && !isMobile && (
        <div
          style={{
            position: "fixed",
            top: "10px",
            right: "190px",
            display: "flex",
            gap: "10px",
            padding: "8px 12px",
            zIndex: 50000,
          }}
        >
          {sessions.map((s) => (
            <div
              key={s.sessionId}
              onClick={() => switchToSession(s.sessionId)}
              style={{
                padding: "6px 12px",
                borderRadius: "40px",
                border:
                  currentSessionId === s.sessionId
                    ? `2px solid ${BRAND}`
                    : "1px solid #ccc",
                background:
                  currentSessionId === s.sessionId ? "#e4fff6" : "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                position: "relative",
                fontSize: "0.9rem",
              }}
            >
              <span
                style={{
                  maxWidth: "110px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  color: "#04352d",
                  fontWeight: 800,
                }}
              >
                {s.name}
              </span>

              <span
                onClick={(e) => openMenuFor(e, s.sessionId)}
                style={{ cursor: "pointer", fontSize: "18px" }}
              >
                ⋮
              </span>

              {menuOpen === s.sessionId && (
                <div
                  style={{
                    position: "fixed",
                    top: dropdownPos.top,
                    left: dropdownPos.left,
                    width: "150px",
                    background: "#fff",
                    border: "1px solid #ccc",
                    borderRadius: "8px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
                    zIndex: 999999999,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    onClick={() => openRename(s.sessionId, s.name)}
                    style={{
                      padding: "10px",
                      borderBottom: "1px solid #eee",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Rename
                  </div>

                  <div
                    onClick={() => requestDelete(s.sessionId)}
                    style={{
                      padding: "10px",
                      cursor: "pointer",
                      color: "red",
                      fontWeight: 600,
                    }}
                  >
                    Delete
                  </div>
                </div>
              )}
            </div>
          ))}

          {sessions.length < 5 && (
            <div
              onClick={addSession}
              title="Add session"
              style={{
                padding: "5px 6px",
                borderRadius: "10px",
                border: "2px dashed #ccc",
                background: "#fff",
                cursor: "pointer",
                fontSize: "1.1rem",
              }}
            >
              ➕
            </div>
          )}
        </div>
      )}

      {/* ⭐ MOBILE SESSION DROPDOWN ⭐ */}
      {isMobile && chatbotOn && (
        <div
          style={{
            position: "fixed",
            top: "15px",
            left: "67px",
            display: "flex",
            flexDirection: "column",
            zIndex: 50000,
          }}
        >
          <div
            onClick={() => setMobileDropdownOpen(!mobileDropdownOpen)}
            style={{
              padding: "10px 14px",
              borderRadius: "12px",
              border: `2px solid ${BRAND}`,
              background: "#fff",
              fontWeight: "600",
              fontSize: "0.95rem",
              color: "#04352d",
              minWidth: "120px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
            }}
          >
            <span>
              {
                sessions.find(
                  (s) => String(s.sessionId) === String(currentSessionId)
                )?.name
              }
            </span>
            <span style={{ fontSize: "16px" }}>▼</span>
          </div>

          {mobileDropdownOpen && (
            <div
              style={{
                marginTop: "6px",
                width: "120px",
                background: "#fff",
                borderRadius: "12px",
                boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
                overflow: "hidden",
                zIndex: 999999,
              }}
            >
              {sessions.map((s) => (
                <div
                  key={s.sessionId}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px",
                    borderBottom: "1px solid #eee",
                    cursor: "pointer",
                    background:
                      String(currentSessionId) === String(s.sessionId)
                        ? "#f0f0f0"
                        : "#fff",
                  }}
                >
                  <span
                    onClick={() => {
                      switchToSession(s.sessionId);
                      setMobileDropdownOpen(false);
                    }}
                    style={{ flexGrow: 1, fontWeight: "600" }}
                  >
                    {s.name}
                  </span>

                  <span
                    onClick={() =>
                      setMobileSessionMenuOpen(
                        mobileSessionMenuOpen === s.sessionId ? null : s.sessionId
                      )
                    }
                    style={{
                      fontSize: "20px",
                      padding: "4px 8px",
                      cursor: "pointer",
                    }}
                  >
                    ⋮
                  </span>

                  {mobileSessionMenuOpen === s.sessionId && (
                    <div
                      style={{
                        position: "absolute",
                        top: "35%",
                        right: "-160px",
                        marginTop: "6px",
                        width: "150px",
                        background: "#fff",
                        borderRadius: "10px",
                        boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
                        zIndex: 200000,
                      }}
                    >
                      <div
                        onClick={() => {
                          openRename(s.sessionId, s.name);
                          setMobileSessionMenuOpen(null);
                          setMobileDropdownOpen(false);
                        }}
                        style={{
                          padding: "10px",
                          borderBottom: "1px solid #eee",
                          cursor: "pointer",
                          fontWeight: "600",
                        }}
                      >
                        Rename
                      </div>

                      <div
                        onClick={() => {
                          requestDelete(s.sessionId);
                          setMobileSessionMenuOpen(null);
                          setMobileDropdownOpen(false);
                        }}
                        style={{
                          padding: "10px",
                          cursor: "pointer",
                          color: "red",
                          fontWeight: "600",
                        }}
                      >
                        Delete
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {sessions.length < 5 && (
                <div
                  onClick={() => {
                    setMobileDropdownOpen(false);
                    addSession();
                  }}
                  style={{
                    padding: "12px",
                    textAlign: "center",
                    background: "#e8fff0",
                    fontWeight: "700",
                    color: "#0a663a",
                    cursor: "pointer",
                  }}
                >
                  + Add Session
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================================
        CHATBOT TOGGLE
      ====================================================================== */}
      <div
        className="chatbot-toggle-container position-fixed d-flex align-items-center"
        style={{
          top: "20px",
          right: "20px",
          gap: "3px",
          zIndex: 999999,
        }}
      >
        <img
          src={Image1}
          className="chatbot-bounce"
          alt="Chatbot"
          style={{ width: "48px", height: "48px", objectFit: "contain" }}
        />

        <div
          onClick={() => setChatbotOn(!chatbotOn)}
          style={{
            width: isMobile ? "70px" : "78px",
            height: isMobile ? "30px" : "34px",
            backgroundColor: chatbotOn ? "#28a745" : "#dc3545",
            borderRadius: "50px",
            cursor: "pointer",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: chatbotOn ? "flex-end" : "flex-start",
            padding: isMobile ? "0 4px" : "0 6px",
            transition: "background-color 0.3s ease, width 0.2s ease",
          }}
        >
          <div
            style={{
              width: isMobile ? "25px" : "24px",
              height: isMobile ? "25px" : "24px",
              borderRadius: "50%",
              backgroundColor: "#fff",
            }}
          ></div>

          <span
            style={{
              position: "absolute",
              width: "100%",
              textAlign: "center",
              color: "#fff",
              fontWeight: "bold",
              fontSize: "0.8rem",
              pointerEvents: "none",
            }}
          >
            {chatbotOn ? "ON" : "OFF"}
          </span>
        </div>
        {/* 🔒 PIN BUTTON */}
 <button
  onClick={() => setShowPinPopup(true)}
  onMouseEnter={() => setHover(true)}
  onMouseLeave={() => setHover(false)}
  style={{
    background: hover ? "#caf8e7ff" : "#fff",
    border: "2px solid #64E2B7",
    borderRadius: "50%",
    width: "42px",
    height: "42px",
    cursor: "pointer",
    fontSize: "18px",
    transition: "background 0.25s ease",
  }}
  title="Finacle Chatbot"
>
  🔒
</button>
      </div>

      {/* ======================================================================
        POPUPS
      ====================================================================== */}

      {/* TABLE POPUP */}
      {showTablePopup && (
        <div
          onClick={() => setShowTablePopup(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999999,
            padding: "20px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(1100px, 90%)",
              maxHeight: "85vh",
              overflowY: "scroll",
              background: "#ffffff",
              borderRadius: "14px",
              padding: "30px 25px",
              boxShadow: "0 6px 30px rgba(0,0,0,0.30)",
              position: "relative",
              scrollbarWidth: "none",
            }}
          >
            <h2
              style={{ color: "#04352d", fontWeight: 700, marginBottom: "15px" }}
            >
              Table Results ({currentTables.length})
            </h2>

            {currentTables.map((table, idx) => (
              <div
                key={idx}
                style={{
                  background: "#fff",
                  borderRadius: "10px",
                  padding: "15px",
                  marginBottom: "25px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                }}
              >
                <img
                  src={getImageUrl(table.path)}
                  alt=""
                  style={{
                    width: "100%",
                    height: "auto",
                    objectFit: "contain",
                    borderRadius: "8px",
                    backgroundColor: "#f0f0f0",
                  }}
                />

                <div style={{ marginTop: "10px", fontSize: "14px", color: "#555" }}>
                  <strong>Type:</strong> {table.type} ·{" "}
                  <strong>Score:</strong> {(table.score * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* IMAGE POPUP */}
      {showImagePopup && (
        <div
          onClick={() => setShowImagePopup(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999999,
            padding: "20px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(1100px, 90%)",
              maxHeight: "85vh",
              overflowY: "scroll",
              background: "#ffffff",
              borderRadius: "14px",
              padding: "30px 25px",
              boxShadow: "0 6px 30px rgba(0,0,0,0.30)",
              position: "relative",
              scrollbarWidth: "none",
            }}
          >
            <h2
              style={{ color: "#04352d", fontWeight: 700, marginBottom: "15px" }}
            >
              Image Results ({currentImages.length})
            </h2>

            {currentImages.map((image, idx) => (
              <div
                key={idx}
                style={{
                  background: "#fff",
                  borderRadius: "10px",
                  padding: "15px",
                  marginBottom: "25px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                }}
              >
                <img
                  src={getImageUrl(image.path)}
                  alt=""
                  style={{
                    width: "100%",
                    height: "auto",
                    objectFit: "contain",
                    borderRadius: "8px",
                    backgroundColor: "#f0f0f0",
                  }}
                />

                <div style={{ marginTop: "10px", fontSize: "14px", color: "#555" }}>
                  <strong>Type:</strong> {image.type} ·{" "}
                  <strong>Score:</strong> {(image.score * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}



      {/* Schedule Drawer */}
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
                zIndex: 9999999,
                display: "flex",
                flexDirection: "column",
                padding: "25px",
            }}
            >

                    <h4 className="fw-bold mb-4" style={{ color: "#04352d" }}>Finacle Schedule</h4>

                    <select
                    className="form-select shadow-sm mb-4"
                style={{
            width: isMobile ? "100%" : "100%",
            maxWidth: isMobile ? "100%" : "100%",
            borderRadius: "10px",
            padding: "12px 14px",
            border: `2px solid ${BRAND}`,
            fontWeight: 600,
            fontSize: "1rem",
            }}


                    value={selectedPdfUrl}
                    onChange={(e) => setSelectedPdfUrl(e.target.value)}
                    >
                    {pdfFiles.length > 0 ? pdfFiles.map((pdf, idx) => <option key={idx} value={pdf.url}>{pdf.title}</option>) : <option disabled>⚠️ No PDFs available</option>}
                    </select>

                    {selectedPdfUrl ? (
                    <iframe key={selectedPdfUrl} src={`${ASSET_BASE}${selectedPdfUrl}#toolbar=0&navpanes=0&scrollbar=0`} title="Schedule PDF Viewer" width="100%" height="100%" style={{ border: "none", backgroundColor: "#fff" }} />
                    ) : (
                    <div className="text-center text-secondary mt-5" style={{ fontStyle: "italic" }}>No PDF available to display.</div>
                    )}
                </div>
                
                {/* Schedule Tab */}
                {isMobile && (
            <div
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



      {/* Show Finacle popup ONLY on mobile & ONLY when chatbot is OFF */}
      {(window.innerWidth > 768 || !chatbotOn) && (
        <FinaclePopup
          module="finacle"
          dayCount={dayCount}
          setSelectedDay={handleSelectDay}
        />
      )}

      {/* Delete confirm modal */}
      {confirmDeleteId && (
        <div
          onClick={cancelDelete}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.45)",
            zIndex: 99999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            animation: "fadeIn 0.25s ease",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(480px, 95%)",
              background: "#fff",
              borderRadius: 14,
              padding: "26px 24px",
              boxShadow: "0 10px 38px rgba(0,0,0,0.25)",
              textAlign: "center",
              animation: "scaleIn 0.25s ease",
            }}
          >
            <h3 style={{ marginTop: 0, color: "#04352d", fontWeight: "700" }}>
              Delete Session
            </h3>

            <p style={{ color: "#333", marginBottom: 25, fontSize: "0.95rem" }}>
              Are you sure you want to delete this session?
              <br />
              <strong>This action cannot be undone.</strong>
            </p>

            <div
              style={{
                display: "flex",
                gap: 14,
                justifyContent: "center",
                marginTop: 10,
              }}
            >
              <button
                onClick={cancelDelete}
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  border: "1px solid #bbb",
                  background: "#fff",
                  cursor: "pointer",
                  minWidth: 130,
                  fontWeight: "600",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDelete(confirmDeleteId)}
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  background: "#e63946",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  minWidth: 130,
                  fontWeight: "600",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename modal */}
      {renameId && (
        <div
          onClick={() => setRenameId(null)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.45)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            animation: "fadeIn 0.25s ease",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(420px, 95%)",
              background: "#fff",
              borderRadius: 14,
              padding: "24px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
              textAlign: "center",
              animation: "scaleIn 0.25s ease",
            }}
          >
            <h3 style={{ marginTop: 0, color: "#04352d", fontWeight: "700" }}>
              Rename Session
            </h3>

            <input
              value={renameText}
              onChange={(e) => setRenameText(e.target.value)}
              autoFocus
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 8,
                border: "1px solid #ccc",
                marginTop: "14px",
                fontSize: "1rem",
                color: "#04352d",
              }}
            />

            <div
              style={{
                display: "flex",
                gap: 14,
                justifyContent: "center",
                marginTop: 22,
              }}
            >
              <button
                onClick={() => setRenameId(null)}
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  border: "1px solid #bbb",
                  background: "#fff",
                  cursor: "pointer",
                  minWidth: 120,
                  fontWeight: "600",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => saveRename(renameId)}
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  background: "#64E2B7",
                  color: "#04352d",
                  border: "none",
                  cursor: "pointer",
                  minWidth: 120,
                  fontWeight: "700",
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      <PinPopup
  isOpen={showPinPopup}
  onClose={() => setShowPinPopup(false)}
  onSuccess={() => {
    setShowPinPopup(false);
    setShowFullChatbot(true);
    document.documentElement.requestFullscreen?.();
  }}
/>

{showFullChatbot && (
  <FullScreenChatbot
    onClose={() => {
      setShowFullChatbot(false);
      document.exitFullscreen?.();
    }}
  />
)}
    </div>
    
  );
}