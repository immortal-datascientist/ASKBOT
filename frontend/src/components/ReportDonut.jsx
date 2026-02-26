import React from "react";
import { PieChart, Pie, Cell } from "recharts";

const COLORS = {
  total: "#236fe0ff",
  attempted: "#f0ec0dff",
  correct: "#198754",
  incorrect: "#dc3545",
  empty: "#f1f3f5"
};

export default function ReportDonut({ report }) {
  // 🔥 SUPPORT BOTH ADMIN & USER DATA
  const total = report?.total || 0;

  const correct =
    report?.correct ??
    report?.answered ??
    0;

  const incorrect =
    report?.incorrect ??
    Math.max(total - correct, 0);

  const attempted = correct + incorrect;
  const unattempted = Math.max(total - attempted, 0);

  return (
    <div className="donut-container" style={{ display: "flex", gap: 40 }}>
      <PieChart width={360} height={360}>
        {/* TOTAL */}
        <Pie
          data={[{ value: total || 1 }]}
          dataKey="value"
          cx="50%"
          cy="50%"
          outerRadius={150}
          innerRadius={132}
          fill={COLORS.total}
          isAnimationActive={false}
        />

        {/* ATTEMPTED */}
        <Pie
          data={[
            { value: attempted },
            { value: unattempted }
          ]}
          dataKey="value"
          cx="50%"
          cy="50%"
          outerRadius={125}
          innerRadius={105}
        >
          <Cell fill={COLORS.attempted} />
          <Cell fill={COLORS.empty} />
        </Pie>

        {/* CORRECT */}
        <Pie
          data={[
            { value: correct },
            { value: Math.max(total - correct, 0) }
          ]}
          dataKey="value"
          cx="50%"
          cy="50%"
          outerRadius={100}
          innerRadius={80}
        >
          <Cell fill={COLORS.correct} />
          <Cell fill={COLORS.empty} />
        </Pie>

        {/* INCORRECT */}
        <Pie
          data={[
            { value: incorrect },
            { value: Math.max(total - incorrect, 0) }
          ]}
          dataKey="value"
          cx="50%"
          cy="50%"
          outerRadius={75}
          innerRadius={55}
        >
          <Cell fill={COLORS.incorrect} />
          <Cell fill={COLORS.empty} />
        </Pie>

        {/* CENTER TEXT */}
        <text
          x="50%"
          y="48%"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontSize: 24, fontWeight: 700 }}
        >
          Analysis
        </text>
      </PieChart>

      {/* STATS */}
      <div className="donut-stats">
        <LegendItem color={COLORS.total} label={`Total Questions: ${total}`} />
        <LegendItem color={COLORS.attempted} label={`Attempted: ${attempted}`} />
        <LegendItem color={COLORS.correct} label={`Correct: ${correct}`} />
        <LegendItem color={COLORS.incorrect} label={`Incorrect: ${incorrect}`} />
      </div>
    </div>
  );
}

/* =====================
   LEGEND ITEM
===================== */
function LegendItem({ color, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
      <div
        style={{
          width: 14,
          height: 14,
          backgroundColor: color,
          borderRadius: "50%",
          marginRight: 10
        }}
      />
      <span style={{ fontWeight: 600 }}>{label}</span>
    </div>
  );
}
