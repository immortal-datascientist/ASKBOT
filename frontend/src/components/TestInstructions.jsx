import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect } from "react";

export default function TestInstructions() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const testId = params.get("testId");
  const pdf = params.get("pdf");

useEffect(() => {
  if (!testId || !pdf) {
    console.error("Invalid test link");
    navigate("/home");
  }
}, [testId, pdf]);


  return (
    <div
      className="container-fluid d-flex justify-content-center align-items-center"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #e6f7f4, #ffffff)",
      }}
    >
      <div
        className="card shadow-lg"
        style={{ maxWidth: "720px", width: "100%", borderRadius: "16px" }}
      >
        <div
          className="card-header text-center"
          style={{
            backgroundColor: "#00a693",
            color: "#fff",
            borderTopLeftRadius: "16px",
            borderTopRightRadius: "16px",
          }}
        >
          <h3 className="mb-0">Assessment Instructions</h3>
        </div>

        <div className="card-body p-4">
          <p className="fw-semibold mb-3">
            Please read the following rules carefully before starting your
            assessment:
          </p>

          <ul className="list-group list-group-flush mb-4">
            <li className="list-group-item">
              ✔ The assessment must be taken in <b>full screen mode</b>.
            </li>
            <li className="list-group-item">
              ✔ Pressing <b>ESC</b> or exiting full screen will{" "}
              <b className="text-danger">auto-submit</b> the assessment.
            </li>
            <li className="list-group-item">
              ✔ Do <b>not refresh</b>, close the tab, or switch applications.
            </li>
            <li className="list-group-item">
              ✔ Any suspicious activity may result in{" "}
              <b className="text-danger">automatic submission</b>.
            </li>
          </ul>

          <div className="alert alert-warning text-center fw-semibold">
            ⚠ Once the assessment starts, it cannot be paused or restarted.
          </div>

          <div className="d-flex justify-content-center mt-4">
            <button
              className="btn btn-lg px-5"
              style={{
                backgroundColor: "#00a693",
                color: "#fff",
                borderRadius: "30px",
                fontWeight: 600,
              }}
              onClick={async () => {
  await document.documentElement.requestFullscreen();
 navigate(`/test-runner?testId=${testId}&pdf=${pdf}`);


}}

            >
              Start Assessment
            </button>
          </div>
        </div>

        <div className="card-footer text-center text-muted small">
          © 2025 Askbot · Secure Assessment Environment
        </div>
      </div>
    </div>
  );
}
