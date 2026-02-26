import React, { useState, useRef, useEffect } from "react";

export default function FullScreenChatbot({ onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const endRef = useRef(null);

  /* AUTO SCROLL */
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ESC TO CLOSE */
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg = { sender: "user", text: input };
    const botMsg = {
      sender: "bot",
      text: "This is a response from the FULL SCREEN chatbot.",
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput("");
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#0b0f14",
        zIndex: 99999999,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          height: "60px",
          background: "#111827",
          color: "#64E2B7",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        <span>Secure AI Assistant</span>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            color: "#fff",
            border: "none",
            fontSize: "22px",
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>

      {/* CHAT AREA */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          justifyContent: "center",
          padding: "20px 0",
          left: "400px",
        }}
      >
        <div
          style={{
            width: "95%",
            maxWidth: "1100px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
                background:
                  m.sender === "user"
                    ? "#64E2B7"
                    : "rgba(100,226,183,0.15)",
                color: "#fbfdfd",
                padding: "12px 16px",
                borderRadius:
                  m.sender === "user"
                    ? "16px 16px 0 16px"
                    : "16px 16px 16px 0",
                maxWidth: "70%",
              }}
            >
              {m.text}
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </div>

      {/* INPUT BAR */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          background: "linear-gradient(to top, #0b0f14 60%, transparent)",
          padding: "20px 0",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: "95%",
            maxWidth: "1100px",
            background: "#ffffff",
            borderRadius: "40px",
            padding: "10px 12px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
            placeholder="Ask anything..."
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: "1rem",
              padding: "14px 18px",
              borderRadius: "30px",
              background: "transparent",
              color: "#333",
            }}
          />

          <button
            onClick={handleSend}
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#2bd576",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="#ffffff"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
