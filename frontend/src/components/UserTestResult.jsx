import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { BACKEND_URL } from "../api/api";


export default function UserTestResult() {
  const { testId } = useParams();
  const userName = localStorage.getItem("userName");
  const [result, setResult] = useState(null);

  useEffect(() => {
    axios
      .get(`${BACKEND_URL}/api/evaluation/result/${testId}/${userName}`)
      .then(res => {
        if (res.data.ok) setResult(res.data.result);
      });
  }, [testId]);

  if (!result) return <p>Loading result...</p>;

  return (
    <div className="result-container">
      <h2>📊 Test Result</h2>

      <div className="score-box">
        <div>✅ Correct: {result.correct}</div>
        <div>❌ Incorrect: {result.incorrect}</div>
        <div>📌 Total: {result.total}</div>
      </div>

      <h3>📝 Topic Feedback</h3>

      {Object.entries(result.feedback).map(([topic, fb]) => (
        <div key={topic} className="feedback-card">
          <h4>{topic}</h4>
          <p>{fb || "No feedback provided"}</p>
        </div>
      ))}
    </div>
  );
}
