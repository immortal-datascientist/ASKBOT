import React, { useEffect, useState } from "react";
import axios from "axios";
import { BACKEND_URL } from "../api/api";
import "./DetailedEvaluation.css";

export default function DetailedEvaluation({ report, onSubmit, onBack }) {
  const [submission, setSubmission] = useState(null);

  const [evaluation, setEvaluation] = useState({
    topics: {},
    overallFeedback: ""
  });

  const [isReviewMode, setIsReviewMode] = useState(false);

  
  /* =========================
     LOAD SUBMISSION + EVALUATION
  ========================= */
useEffect(() => {
  if (!report) return;

  axios.get(
  `${BACKEND_URL}/api/evaluation/submission/${report.testName}/${report.userName}/${report.attemptNo}`
)

    .then(res => {
      if (!res.data.ok) return;

      setSubmission(res.data.submission);

      const hasEvaluation =
        res.data.evaluation &&
        Object.keys(res.data.evaluation.topics || {}).length > 0;

      if (hasEvaluation) {
        const loadedEvaluation = res.data.evaluation;

        // ✅ AUTO FIX: remove topic pending if no pending questions
        Object.values(loadedEvaluation.topics).forEach(topic => {
          const hasUnanswered = topic.questions.some(
            q => q.result === "" || q.result === "pending"
          );

          if (!hasUnanswered) {
            topic.status = "normal";
          }
        });

        setEvaluation({
          ...loadedEvaluation,
          overallFeedback: loadedEvaluation.overallFeedback || ""
        });

        // 🔑 SINGLE SOURCE OF TRUTH
        // isReEvaluation = true  → editable
        // isReEvaluation = false → view-only
        setIsReviewMode(!res.data.isReEvaluation);

      } else {
        // 🆕 First-time evaluation
        initEvaluation(res.data.submission);
        setIsReviewMode(false); // editable
      }
    })
    .catch(err => {
      console.error("Load failed:", err);
    });
}, [report]);



  /* =========================
     INIT STRUCTURE
  ========================= */
  const initEvaluation = (sub) => {
    const topics = {};

    sub.answers.forEach(q => {
      if (!topics[q.section]) {
        topics[q.section] = {
          status: "normal",
          questions: []
        };
      }

      topics[q.section].questions.push({
        questionNo: q.questionNo,
        result: "" // default
      });
    });

    setEvaluation({
      topics,
      overallFeedback: ""
    });
  };

  /* =========================
     TOGGLE YES / NO / PENDING
  ========================= */
 const markResult = (section, qNo, value) => {
  if (isReviewMode) return;

  setEvaluation(prev => {
    const updatedQuestions = prev.topics[section].questions.map(q =>
      q.questionNo === qNo
        ? { ...q, result: q.result === value ? "" : value }
        : q
    );

    // ✅ CHECK IF ANY QUESTION IS UNANSWERED OR PENDING
    const hasUnanswered = updatedQuestions.some(
      q => q.result === "" || q.result === "pending"
    );

    return {
      ...prev,
      topics: {
        ...prev.topics,
        [section]: {
          ...prev.topics[section],
          questions: updatedQuestions,
          // 🔒 AUTO REMOVE TOPIC PENDING
          status: hasUnanswered ? prev.topics[section].status : "normal"
        }
      }
    };
  });
};

  /* =========================
     TOGGLE TOPIC PENDING
  ========================= */
  const markTopicPending = (section) => {
  if (isReviewMode) return;

  const questions = evaluation.topics[section].questions;

  const hasUnanswered = questions.some(
    q => q.result === "" || q.result === "pending"
  );

  // ❌ DO NOT ALLOW PENDING IF ALL ANSWERED
  if (!hasUnanswered) return;

  setEvaluation(prev => ({
    ...prev,
    topics: {
      ...prev.topics,
      [section]: {
        ...prev.topics[section],
        status:
          prev.topics[section].status === "pending"
            ? "normal"
            : "pending"
      }
    }
  }));
};


 


  /* =========================
     SUBMIT (FINAL + REEVALUATION LOGIC)
  ========================= */
  const submitEvaluation = async () => {
    let correct = 0;
    let incorrect = 0;

    const hasPendingQuestion = Object.values(evaluation.topics).some(topic =>
      topic.questions.some(q => q.result === "pending")
    );

    const hasPendingTopic = Object.values(evaluation.topics).some(
      topic => topic.status === "pending"
    );

    const isReEvaluation = hasPendingQuestion || hasPendingTopic;

    Object.values(evaluation.topics).forEach(topic => {
      topic.questions.forEach(q => {
        if (q.result === "yes") correct++;
        if (q.result === "no") incorrect++;
      });
    });

    const summary = {
  testName: report.testName,
  userName: report.userName,
 total: submission.totalQuestions, // ✅ ALWAYS real total
  attempted: correct + incorrect,
  correct,
  incorrect
};


    try {
   await axios.post(`${BACKEND_URL}/api/evaluation/submit`, {
  testId: report.testName.replace(/\.pdf$/i, ""),
  userName: report.userName,
  attemptNo: submission.attempt,
  evaluation,
  summary,
  isReEvaluation: submission.attempt > 1
});


      if (isReEvaluation) {
        alert("🟡 Saved for Re-Evaluation. Report not generated.");
        return; // ❌ DO NOT update user UI
      }

      alert("✅ Evaluation submitted successfully");
      setIsReviewMode(true);
      onSubmit(summary); // ✅ update UI only if final
    } catch (err) {
      console.error("Submit failed:", err.response?.data || err.message);
      alert("❌ Submit failed");
    }
  };

  const OverallFeedback = (
    <div
      style={{
        marginTop: "24px",
        padding: "20px",
        borderRadius: "14px",
        background: "#f9fbfb",
        border: "1px solid #dfeeee",
        boxShadow: "0 6px 18px rgba(0,0,0,0.06)"
      }}
    >
      <h4 style={{ marginBottom: "12px", color: "#04352d" }}>
        Overall Feedback
      </h4>

      {isReviewMode ? (
        <div
          style={{
            background: "#e6f7f4",
            padding: "14px",
            borderRadius: "10px",
            borderLeft: "5px solid #00a693"
          }}
        >
          {evaluation.overallFeedback || "No feedback provided"}
        </div>
      ) : (
        <textarea
          value={evaluation.overallFeedback}
          onChange={e =>
            setEvaluation(prev => ({
              ...prev,
              overallFeedback: e.target.value
            }))
          }
          rows={5}
          style={{ width: "100%", padding: "12px", borderRadius: "8px" }}
        />
      )}
    </div>
  );

  /* =========================
     UI
  ========================= */
  return (
    <div className="evaluation-container">
      {isReviewMode && OverallFeedback}

      {submission &&
        Object.entries(evaluation.topics).map(([section, data]) => (
          <div
            key={section}
            className={`topic-card mt-3 ${
              data.status === "pending" ? "topic-pending" : ""
            }`}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h4>{section}</h4>

              {!isReviewMode && (
                <button
                  className={`pending-btn ${
                    data.status === "pending" ? "active" : ""
                  }`}
                  onClick={() => markTopicPending(section)}
                >
                  Mark Topic Pending
                </button>
              )}
            </div>

            {submission.answers
              .filter(q => q.section === section)
              .map((q, index) => {
                const evalQ = data.questions.find(
                  x => x.questionNo === q.questionNo
                );

                return (
                  <div
                    key={q.questionNo}
                    className={`question-eval ${
                      evalQ?.result === "yes"
                        ? "correct"
                        : evalQ?.result === "no"
                        ? "incorrect"
                        : evalQ?.result === "pending"
                        ? "pending"
                        : ""
                    }`}
                  >
                    <b>{index + 1}. {q.question}</b>

                    <div>
  <b>Ans:</b>
  <pre
    style={{
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      background: "#f8f9fa",
      padding: "10px",
      borderRadius: "8px",
      marginTop: "6px",
      fontFamily: "monospace"
    }}
  >
    {q.answer}
  </pre>
</div>


                    {!isReviewMode && (
                      <div className="yn-bottom-right">
                        <button
                          className={`yes-btn ${
                            evalQ?.result === "yes" ? "active" : ""
                          }`}
                          onClick={() =>
                            markResult(section, q.questionNo, "yes")
                          }
                        >
                          Yes
                        </button>

                        <button
                          className={`no-btn ${
                            evalQ?.result === "no" ? "active" : ""
                          }`}
                          onClick={() =>
                            markResult(section, q.questionNo, "no")
                          }
                        >
                          No
                        </button>

                        <button
                          className={`pending-btn ${
                            evalQ?.result === "pending" ? "active" : ""
                          }`}
                          onClick={() =>
                            markResult(section, q.questionNo, "pending")
                          }
                        >
                          Pending
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        ))}

      {!isReviewMode && OverallFeedback}

      {!isReviewMode && (
        <div style={{ textAlign: "center", marginTop: "30px" }}>
          <button className="submit-eval" onClick={submitEvaluation}>
            Submit Evaluation
          </button>
        </div>
      )}
    </div>
  );
}
