import React, { useEffect, useState } from "react";
import axios from "axios";
import { BACKEND_URL } from "../api/api";
import "./AdminEvaluation.css";
import DetailedEvaluation from "./DetailedEvaluation";
import ReportDonut from "./ReportDonut";

export default function AdminEvaluation() {
  const [reports, setReports] = useState([]);
  const [openEvaluation, setOpenEvaluation] = useState(null);
  const [openChart, setOpenChart] = useState(null);
 const [selectedCardId, setSelectedCardId] = useState(null);


 useEffect(() => {
  const loadReportsWithStatus = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/evaluation/reports`);

      if (!res.data.ok) return;

      const reportsWithStatus = await Promise.all(
        res.data.reports.map(async (r) => {
          // 🟡 If it is in re-evaluation, it is in progress
          if (r.isReEvaluation) {
            return { ...r, status: "IN_PROGRESS" };
          }

          // 🔍 Check if final evaluation exists
          try {
            await axios.get(
              `${BACKEND_URL}/api/evaluation/result/${r.testName}/${r.userName}`
            );

            // 🟢 Evaluation completed
            return { ...r, status: "COMPLETED" };
          } catch {
            // ⚪ Evaluation not started yet
            return { ...r, status: "NOT_STARTED" };
          }
        })
      );

      setReports(reportsWithStatus);
    } catch (err) {
      console.error("Failed to load evaluation reports", err);
    }
  };

  loadReportsWithStatus();
}, []);




const handleDelete = async (report) => {
  const confirmDelete = window.confirm(
    `Are you sure you want to delete "${report.testName} (${report.attempt})"?`
  );

  if (!confirmDelete) return;

  try {
    await axios.delete(`${BACKEND_URL}/api/evaluation/delete`, {
      data: {
        testId: report.testName,
        userName: report.userName,
        attempt: report.attempt.split("-")[1]
      }
    });

    // ✅ Remove ONLY this attempt from UI
    setReports(prev =>
      prev.filter(
        r =>
          !(
            r.testName === report.testName &&
            r.userName === report.userName &&
            r.attempt === report.attempt
          )
      )
    );

    alert("✅ Report deleted successfully");
  } catch (err) {
    console.error("Delete failed:", err);
    alert("❌ Failed to delete report");
  }
};


const getCardStatusClass = (r) => {
  if (r.status === "COMPLETED") return "status-completed";
  if (r.status === "IN_PROGRESS") return "status-pending";
  return "status-not-started";
};





  // ✅ RECEIVES SUMMARY FROM CHILD
 const updateReportSummary = (summary) => {
  const fixedSummary = {
    total: summary.total ?? 0,
    attempted: summary.attempted ?? 0,
    correct: summary.correct ?? 0,
    incorrect: summary.incorrect ?? 0,
     __uiCompleted: true  
  };

 setReports(prev =>
  prev.map(r =>
    r.testName === summary.testName &&
    r.userName === summary.userName &&
    r.attempt === `attempt-${summary.attempt}`
      ? {
          ...r,
          total: summary.total,
          attempted: summary.attempted,
          correct: summary.correct,
          incorrect: summary.incorrect,
          status: "COMPLETED"
        }
      : r
  )
);


  setOpenChart(fixedSummary); // ✅ ALWAYS has total
  setOpenEvaluation(null);
};


  return (
    <div className="evaluation-container">
      <h3>📂 Evaluation Reports</h3>

      <div className="report-grid">
        {reports.map((r, i) => (
       <div
  key={i}
  className={`report-card 
  ${getCardStatusClass(r)}
  ${selectedCardId === i ? "active" : ""}
`}
  onClick={() => {
    setSelectedCardId(i);
    setOpenEvaluation({
  ...r,
  testName: r.testName.replace(/\.pdf$/i, ""),
  attemptNo: Number(r.attempt.split("-")[1])
});

    setOpenChart(null);
  }}
>
  {/* DELETE ICON */}
  <button
    className="delete-icon"
    onClick={(e) => {
      e.stopPropagation();
      handleDelete(r);
    }}
    title="Delete Report"
  >
    ✕
  </button>

  <div className="file-icon">📄</div>

  <h5 className="test-name">
  {r.testName} <small>({r.attempt})</small>
</h5>


  <p className="user-name">
    <span>User:</span> {r.userName}
  </p>

  <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
  {/* View Report */}
<button
  className="report-btn"
  onClick={async (e) => {
    e.stopPropagation();
    setOpenEvaluation(null);

    try {
      const cleanTestId = r.testName.replace(/\.pdf$/i, "");
      const attemptNo = Number(r.attempt.split("-")[1]);

      const res = await axios.get(
        `${BACKEND_URL}/api/evaluation/result/${cleanTestId}/${r.userName}`,
        { params: { attempt: attemptNo } }
      );

      if (!res.data?.ok) {
        alert("No report found");
        return;
      }

      setOpenChart(res.data.summary);
    } catch (err) {
      console.error(err);
      alert("Failed to load report");
    }
  }}
>
  Report
</button>




  {/* 🆕 Reevaluation */}
<button
  className="reeval-btn"
  onClick={(e) => {
    e.stopPropagation();

    setOpenEvaluation({
      ...r,
      testName: r.testName.replace(/\.pdf$/i, ""),
      attemptNo: Number(r.attempt.split("-")[1]),
      isReEvaluation: true
    });

    setOpenChart(null);
  }}
>
  ReEvaluation
</button>


</div>

</div>


        ))}
      </div>

      {openEvaluation && (
        <DetailedEvaluation
          report={openEvaluation}
          onSubmit={updateReportSummary}
          onBack={() => setOpenEvaluation(null)}
        />
      )}

    {openChart && (
  <ReportDonut
    report={{
      total: openChart.total,
      answered: openChart.attempted, // ✅ FIXED
      correct: openChart.correct ?? 0,
      incorrect: openChart.incorrect ?? 0
    }}
  />
)}


    </div>
  );
}
