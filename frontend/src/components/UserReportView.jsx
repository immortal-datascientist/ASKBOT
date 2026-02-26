import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { BACKEND_URL } from "../api/api";
import ReportDonut from "./ReportDonut";

export default function UserReportView({ testId, userName }) {
  const [evaluation, setEvaluation] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [summary, setSummary] = useState(null);

  // ✅ match server.js expectations
  const cleanTestId = useMemo(() => {
    return String(testId || "").replace(/\.pdf$/i, "");
  }, [testId]);

  const cleanUserName = useMemo(() => {
    return String(userName || "").trim();
  }, [userName]);

  useEffect(() => {
    if (!cleanTestId || !cleanUserName) return;

    const loadReport = async () => {
      try {
        // 1️⃣ submission + evaluation
        const subRes = await axios.get(
          `${BACKEND_URL}/api/evaluation/submission/${cleanTestId}/${cleanUserName}`
        );

        if (!subRes.data.ok) return;

        setSubmission(subRes.data.submission);
        setEvaluation(subRes.data.evaluation);

        // 2️⃣ FINAL summary (attempt-aware)
        const resultRes = await axios.get(
          `${BACKEND_URL}/api/evaluation/result/${cleanTestId}/${cleanUserName}`,
          {
            params: { attempt: subRes.data.submission.attempt }
          }
        );

        if (resultRes.data.ok) {
          setSummary(resultRes.data.summary);
        }
      } catch (err) {
        console.error("❌ User report load failed:", err);
      }
    };

    loadReport();
  }, [cleanTestId, cleanUserName]);

  if (!submission || !evaluation || !summary) {
    return <p style={{ textAlign: "center" }}>Loading report...</p>;
  }

  return (
    <div className="user-report-container">
      {/* DONUT */}
      <ReportDonut report={summary} />

      {/* FEEDBACK */}
      <div
        style={{
          marginTop: 30,
          padding: 20,
          borderRadius: 14,
          background: "#f9fbfb",
          border: "1px solid #dfeeee",
          boxShadow: "0 6px 18px rgba(0,0,0,0.06)"
        }}
      >
        <h4 style={{ marginBottom: 12, color: "#04352d" }}>
          Overall Feedback
        </h4>
        <div
          style={{
            background: "#e6f7f4",
            padding: 14,
            borderRadius: 10,
            borderLeft: "5px solid #00a693"
          }}
        >
          {evaluation.overallFeedback || "No feedback provided"}
        </div>
      </div>

      {/* QUESTIONS */}
      {Object.entries(evaluation.topics).map(([section, data]) => (
        <div key={section} className="topic-card mt-3">
          <h4>{section}</h4>

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
      : "pending"
  }`}
>
  <b>{index + 1}. {q.question}</b>

  <div style={{ marginTop: "6px" }}>
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
</div>

              );
            })}
        </div>
      ))}
    </div>
  );
}
