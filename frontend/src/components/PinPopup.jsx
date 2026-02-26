import React, { useState, useRef, useEffect } from "react";

export default function PinPopup({
  isOpen,
  onClose,
  onSuccess,
  correctPin = "12345",
}) {
  const PIN_LENGTH = correctPin.length;

  const [pin, setPin] = useState(() => Array(PIN_LENGTH).fill(""));
  const inputRefs = useRef([]);

  useEffect(() => {
    if (isOpen) {
      setPin(Array(PIN_LENGTH).fill(""));
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 50);
    }
  }, [isOpen, PIN_LENGTH]);

  if (!isOpen) return null;

  const handleChange = (value, index) => {
    if (!/^\d?$/.test(value)) return;

    const updated = [...pin];
    updated[index] = value;
    setPin(updated);

    if (value && index < PIN_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (e.key === "Enter") {
      handleUnlock();
    }
  };

  const handleUnlock = () => {
    if (pin.join("") === correctPin) {
      onSuccess();
      setPin(Array(PIN_LENGTH).fill(""));
    } else {
      alert("❌ Invalid PIN");
      setPin(Array(PIN_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backdropFilter: "blur(8px)",
        background: "rgba(0,0,0,0.45)",
        zIndex: 9999999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "360px",
          background: "#0b0b0b",
          color: "#fff",
          borderRadius: "16px",
          padding: "30px",
          textAlign: "center",
          boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
        }}
      >
        <h3 style={{ marginBottom: "10px" }}>Enter PIN</h3>
        <p style={{ fontSize: "0.9rem", opacity: 0.7 }}>
          We need your PIN before you can chat
        </p>

        {/* PIN INPUTS */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "center",
            margin: "20px 0",
          }}
        >
          {pin.map((v, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="password"
              maxLength={1}
              value={v}
              onChange={(e) => handleChange(e.target.value, i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              style={{
                width: "45px",
                height: "50px",
                fontSize: "22px",
                textAlign: "center",
                borderRadius: "8px",
                border: "1px solid #444",
                background: "#111",
                color: "#fff",
              }}
            />
          ))}
        </div>

        <button
          onClick={handleUnlock}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "10px",
            background: "#64E2B7",
            border: "none",
            fontWeight: "700",
            cursor: "pointer",
          }}
        >
          UNLOCK
        </button>

        <button
          onClick={onClose}
          style={{
            marginTop: "10px",
            background: "transparent",
            color: "#aaa",
            border: "none",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
