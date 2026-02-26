import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { BACKEND_URL } from "../api/api";
import "./TestRunner.css";

export default function TestRunner() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const testId = params.get("testId");
  const pdf = params.get("pdf");

  const userName =
    localStorage.getItem("employeeName") ||
    localStorage.getItem("email");

  const hasSubmitted = useRef(false);

  const [sections, setSections] = useState([]);
  const [answers, setAnswers] = useState({});
  const answersRef = useRef({});
  const questionMapRef = useRef({});
  const [loading, setLoading] = useState(true);

  // Security tracking states
  const [violations, setViolations] = useState({
    fullscreenExits: 0,
    tabSwitches: 0,
    totalViolations: 0,
  });
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const violationsRef = useRef({ fullscreenExits: 0, tabSwitches: 0, totalViolations: 0 });

  const MAX_VIOLATIONS = 3;

  /* ============================
     KEEP LATEST ANSWERS
  ============================ */
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  /* ============================
     KEEP LATEST VIOLATIONS
  ============================ */
  useEffect(() => {
    violationsRef.current = violations;
  }, [violations]);

  /* ============================
     LOG VIOLATION
  ============================ */
  const logViolation = (type, message, instantSubmit = false) => {
  if (hasSubmitted.current) return;

  const current = violationsRef.current;

  // Stop counting after limit
  if (current.totalViolations >= MAX_VIOLATIONS) return;

  const newViolations = {
    ...current,
    [type]: current[type] + 1,
    totalViolations: current.totalViolations + 1,
  };

  violationsRef.current = newViolations;
  setViolations(newViolations);

  setWarningMessage(message);
  setShowWarning(true);

  axios.post(`${BACKEND_URL}/api/test/log-violation`, {
    testId,
    userName,
    violationType: type,
    timestamp: new Date().toISOString(),
  }).catch(() => {});

  // 🚨 TAB SWITCH = IMMEDIATE SUBMIT
  if (instantSubmit) {
    alert("🚫 Tab switched. Exam auto-submitting...");
    autoSubmitExam("Tab switch detected");
    return;
  }

  // 🚨 MAX VIOLATIONS = AUTO SUBMIT
  if (newViolations.totalViolations >= MAX_VIOLATIONS) {
    alert("🚫 Maximum violations reached. Auto-submitting exam...");
    autoSubmitExam("Maximum violations reached");
  }
};


  /* ============================
     HELPER: BUILD ANSWERED QUESTIONS
  ============================ */
  const buildAnsweredQuestions = () => {
  const answered = [];

  // Normal mode — sections exist
  if (sections.length) {
    sections.forEach((sec) => {
      sec.questions.forEach((q) => {
        const key = `${sec.section}_${q.id}`;
        const val = answersRef.current[key];

        if (typeof val === "string" && val.trim()) {
          answered.push({
            section: sec.section,
            questionNo: q.id,
            question: q.text,
            answer: val.trim(),
          });
        }
      });
    });
  }

  // Fallback mode — recover from stored map
  else {
    const questionMap = questionMapRef.current || {};

    Object.entries(answersRef.current).forEach(([key, value]) => {
      if (typeof value === "string" && value.trim()) {
        answered.push({
          section: key.split("_")[0] || "Unknown",
          questionNo: key.split("_")[1] || "Unknown",
          question: questionMap[key] || "Recovered answer",
          answer: value.trim(),
        });
      }
    });
  }

  return answered;
};


  /* ============================
     AUTO SUBMIT (VIOLATIONS)
  ============================ */
 const autoSubmitExam = async (reason) => {
  if (hasSubmitted.current) return;
  hasSubmitted.current = true;

  console.log("🚨 AUTO SUBMIT:", reason);

  const answeredQuestions = buildAnsweredQuestions();

  try {
    await axios.post(`${BACKEND_URL}/api/test/submit-answers`, {
      testId,
      userName,
      totalQuestions: sections.reduce((s, sec) => s + sec.questions.length, 0),
      answers: answeredQuestions,
      autoSubmitted: true,
      autoSubmitReason: reason,
      violations: violationsRef.current,
    });

    await axios.post(`${BACKEND_URL}/api/test/submit`, {
      testId,
      userId: localStorage.getItem("userId"),
      autoSubmitted: true,
      flagged: true,
      violations: violationsRef.current,
    });

  } catch (err) {
    console.error("❌ Auto-submit failed:", err);
  }

  // Exit fullscreen
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }

  // Show final popup
  alert(`Exam auto-submitted: ${reason}`);

  // ✅ Redirect to FINACLE MENU
  navigate("/home-menu", { replace: true });
};


  /* ============================
     FORCE FULLSCREEN (CRITICAL)
  ============================ */
  useEffect(() => {
  const handleFullscreenChange = () => {
    if (!document.fullscreenElement && !hasSubmitted.current) {
      logViolation(
        "fullscreenExits",
        `⚠️ Fullscreen exit detected! Violation ${
          violationsRef.current.totalViolations + 1
        }/${MAX_VIOLATIONS}`
      );

      // ✅ mark that fullscreen must be re-entered
      window.__needsFullscreenReentry = true;

      // UX hint (optional but recommended)
      setWarningMessage("⚠️ Fullscreen required. Click anywhere to continue.");
      setShowWarning(true);
    }
  };

  document.addEventListener("fullscreenchange", handleFullscreenChange);

  return () => {
    document.removeEventListener("fullscreenchange", handleFullscreenChange);
  };
}, []);

  /* ============================
     BLOCK KEYS
  ============================ */
  useEffect(() => {
    const blockKeys = (e) => {
      const blockedKeys = [
        "Escape",
        "F1","F2","F3","F4","F5","F6",
        "F7","F8","F9","F10","F11","F12"
      ];

      if (
        blockedKeys.includes(e.key) ||
        e.key === "Meta" ||
        (e.altKey && e.key === "Tab")
      ) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }

      if (e.ctrlKey && ["c", "v", "x", "a"].includes(e.key.toLowerCase())) {
        if (e.key.toLowerCase() !== "a") {
          e.preventDefault();
          return false;
        }
      }
    };

    window.addEventListener("keydown", blockKeys, { capture: true });
    window.addEventListener("keyup", blockKeys, { capture: true });

    return () => {
      window.removeEventListener("keydown", blockKeys, { capture: true });
      window.removeEventListener("keyup", blockKeys, { capture: true });
    };
  }, []);

  /* ============================
     TAB SWITCH DETECTION
  ============================ */
 useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden && !hasSubmitted.current) {
      logViolation(
        "tabSwitches",
        "🚫 Tab switch detected — Auto submitting",
        true
      );
    }
  };

  const handleBlur = () => {
    if (!hasSubmitted.current) {
      logViolation(
        "tabSwitches",
        "🚫 Window focus lost — Auto submitting",
        true
      );
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("blur", handleBlur);

  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("blur", handleBlur);
  };
}, []);


  /* ============================
     DISABLE RIGHT CLICK
  ============================ */
  useEffect(() => {
    const blockContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener("contextmenu", blockContextMenu);

    return () => {
      document.removeEventListener("contextmenu", blockContextMenu);
    };
  }, []);

  /* ============================
     PREVENT BACK BUTTON
  ============================ */
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);

    const handlePopState = (e) => {
      if (!hasSubmitted.current) {
        window.history.pushState(null, "", window.location.href);
        
        const confirmExit = window.confirm(
          "⚠️ Going back will submit your exam automatically. Are you sure?"
        );

        if (confirmExit) {
          autoSubmitExam("User attempted to navigate back");
        }
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [sections]); // ✅ Added sections dependency

  /* ============================
     PREVENT PAGE CLOSE/RELOAD
  ============================ */
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!hasSubmitted.current) {
        e.preventDefault();
        e.returnValue = "Your exam is in progress. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);



  useEffect(() => {
  const reenterFullscreen = () => {
    if (
      window.__needsFullscreenReentry &&
      !document.fullscreenElement &&
      !hasSubmitted.current
    ) {
      document.documentElement
        .requestFullscreen({ navigationUI: "hide" })
        .then(() => {
          window.__needsFullscreenReentry = false;
        })
        .catch(() => {});
    }
  };

  // Any gesture works
  window.addEventListener("click", reenterFullscreen, true);
  window.addEventListener("keydown", reenterFullscreen, true);
  window.addEventListener("mousedown", reenterFullscreen, true);
  window.addEventListener("touchstart", reenterFullscreen, true);

  return () => {
    window.removeEventListener("click", reenterFullscreen, true);
    window.removeEventListener("keydown", reenterFullscreen, true);
    window.removeEventListener("mousedown", reenterFullscreen, true);
    window.removeEventListener("touchstart", reenterFullscreen, true);
  };
}, []);


  /* ============================
     LOAD QUESTIONS
  ============================ */
  useEffect(() => {
    if (!pdf) return;

    setLoading(true);

    axios
      .get(`${BACKEND_URL}/api/test/questions/${encodeURIComponent(pdf)}`)
      .then((res) => {
        if (res.data.ok && Array.isArray(res.data.sections)) {
          console.log("✅ Loaded sections:", res.data.sections);
          setSections(res.data.sections);
        } else {
          alert("Failed to load questions");
        }
      })
      .catch(() => alert("Failed to load questions"))
      .finally(() => setLoading(false));
  }, [pdf]);

  /* ============================
     ANSWER HANDLER
  ============================ */
  const handleAnswerChange = (section, qId, questionText, value) => {
  const key = `${section}_${qId}`;

  setAnswers((prev) => ({
    ...prev,
    [key]: value,
  }));

  // Store question text safely (no pollution)
  questionMapRef.current[key] = questionText;
};


  /* ============================
     PROGRESS
  ============================ */
  const totalQuestions = useMemo(
    () => sections.reduce((sum, sec) => sum + sec.questions.length, 0),
    [sections]
  );

  const answeredCount = useMemo(
  () =>
    Object.values(answers).filter(
      (v) => typeof v === "string" && v.trim().length > 0
    ).length,
  [answers]
);

  /* ============================
     MANUAL SUBMIT
  ============================ */
  const handleSubmit = async () => {
    if (hasSubmitted.current) return;
    hasSubmitted.current = true;

    console.log("✅ MANUAL SUBMIT");
    const answeredQuestions = buildAnsweredQuestions();

    try {
      await axios.post(`${BACKEND_URL}/api/test/submit-answers`, {
        testId,
        userName,
        totalQuestions,
        answers: answeredQuestions,
        autoSubmitted: false,
        violations: violationsRef.current,
      });

      await axios.post(`${BACKEND_URL}/api/test/submit`, {
        testId,
        userId: localStorage.getItem("userId"),
        flagged: violations.totalViolations > 0,
        violations: violationsRef.current,
      });
    } catch (err) {
      console.error("Submission error", err);
    }

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    navigate("/home", { replace: true });
  };

  /* ============================
     SAFETY
  ============================ */
  if (!pdf) {
    return <h3 style={{ padding: 20 }}>Invalid Test Link</h3>;
  }

  return (
    <div className="exam-container">
      {showWarning && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            background: "#ff4444",
            color: "white",
            padding: "15px",
            textAlign: "center",
            fontSize: "16px",
            fontWeight: "bold",
            zIndex: 10000,
            animation: "slideDown 0.3s ease",
          }}
        >
          {warningMessage}
        </div>
      )}

      <header className="exam-header">
        <h2>Assessment</h2>
        <div className="progress-info">
          Answered {answeredCount} / {totalQuestions}
          {violations.totalViolations > 0 && (
            <span
              style={{
                marginLeft: "20px",
                color: violations.totalViolations >= MAX_VIOLATIONS ? "#ff4444" : "#ff9800",
                fontWeight: "bold",
              }}
            >
              ⚠️ Violations: {violations.totalViolations}/{MAX_VIOLATIONS}
            </span>
          )}
        </div>
      </header>

      <main className="exam-content">
        {loading ? (
          <p>Loading questions...</p>
        ) : (
          sections.map((sec, sIdx) => (
            <section className="section-card" key={sIdx}>
              <h3 className="section-title">{sec.section}</h3>

              {sec.questions.map((q, qIdx) => {
                const key = `${sec.section}_${q.id}`;
                const isAnswered =
  typeof answers[key] === "string" && answers[key].trim();


                return (
                  <div
                    key={q.id}
                    className={`question-card ${isAnswered ? "answered" : ""}`}
                  >
                    <div className="question-number">{qIdx + 1}</div>

                    <div className="question-body">
                      <p className="question-text">{q.text}</p>
                      <textarea
                        className="answer-textarea"
                        placeholder="Type your answer here..."
                        value={typeof answers[key] === "string" ? answers[key] : ""}
                        onChange={(e) =>
  handleAnswerChange(sec.section, q.id, q.text, e.target.value)
}

                        onCopy={(e) => e.preventDefault()}
                        onPaste={(e) => e.preventDefault()}
                        onCut={(e) => e.preventDefault()}
                      />
                    </div>
                  </div>
                );
              })}
            </section>
          ))
        )}
      </main>

      <footer className="exam-footer">
        <button
          className="submit-btn"
          disabled={answeredCount === 0}
          onClick={handleSubmit}
        >
          Submit Assessment
        </button>
      </footer>
    </div>
  );
}