// src/components/AdminPage.js

import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  BACKEND_URL,
  API_ROUTES,
  getTempChatStatus,
  setTempChatReceiving,
  getTestDocuments,
  assignTest,
} from "../api/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import HistoryIcon from "@mui/icons-material/History";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import AddIcon from "@mui/icons-material/Add";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ChatIcon from "@mui/icons-material/Chat";
import AssignmentIcon from "@mui/icons-material/Assignment";
import AdminEvaluation from "./AdminEvaluation";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";

import DescriptionIcon from "@mui/icons-material/Description";



export default function AdminPage() {
  const [adminEmail] = useState(
    localStorage.getItem("adminEmail") || "admin@gmail.com"
  );

  // ===== DAYWISE STATES (ADD) =====
const [availableDays, setAvailableDays] = useState([]);
const [dayTitles, setDayTitles] = useState({});
const [selectedDay, setSelectedDay] = useState(null);
const [isNewDay, setIsNewDay] = useState(false);
const [dayCount, setDayCount] = useState(0);
const [singleVideo, setSingleVideo] = useState(null);
const [domain, setDomain] = useState("finacle");
const [existingImage, setExistingImage] = useState(null);
const [removeImage, setRemoveImage] = useState(false);

const [showPreview, setShowPreview] = useState(false);
const [testStatuses, setTestStatuses] = useState({});

const [showTestUpload, setShowTestUpload] = useState(false);
const [testPdfFile, setTestPdfFile] = useState(null);
const [uploading, setUploading] = useState(false);



  const [showForm, setShowForm] = useState(false);
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [role, setRole] = useState("employee");
  const [activeModule, setActiveModule] = useState("users");
// users | temp | upload


  const [tempReceiveEnabled, setTempReceiveEnabled] = useState(true);

  const [users, setUsers] = useState([]);
  const [msg, setMsg] = useState("");
  const [tempChats, setTempChats] = useState([]);
  const [showTempChatsPanel, setShowTempChatsPanel] = useState(false);
// ================= UPLOAD STATES =================
const [uploadCategory, setUploadCategory] = useState("");
const [uploadTitle, setUploadTitle] = useState("");
const [uploadDay, setUploadDay] = useState("");
const [uploadLanguage, setUploadLanguage] = useState("english");
// ✅ Evaluation reports (for Create Test status)
const [evaluationReports, setEvaluationReports] = useState([]);


const [uploadPdf, setUploadPdf] = useState(null);
const [uploadVideos, setUploadVideos] = useState({
  english: null,
  tamil: null,
  telugu: null,
  kannada: null,
});

const [uploadImage, setUploadImage] = useState(null);

const [uploadMsg, setUploadMsg] = useState("");

// ================= CREATE TEST =================
  const [testDocs, setTestDocs] = useState([]);
  const [selectedTestDoc, setSelectedTestDoc] = useState(null);
  const [selectedTestUsers, setSelectedTestUsers] = useState([]);



  // Modals state
  const [editingUserData, setEditingUserData] = useState(null);
  const [deleteUserData, setDeleteUserData] = useState(null);
  const [modalImage, setModalImage] = useState(null);

  // History state
  const [historyUser, setHistoryUser] = useState(null);
  const [userSessions, setUserSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionMessages, setSessionMessages] = useState([]);

  // ✅ ONLY for Create Test module
const finacleUsersForTest = users.filter(
  (u) => u.domain === "finacle"
);


  // selecting all users and single user

 const isAllSelected =
  finacleUsersForTest.length > 0 &&
  selectedTestUsers.length === finacleUsersForTest.length;


const toggleAllUsers = () => {
  if (isAllSelected) {
    setSelectedTestUsers([]);
  } else {
   setSelectedTestUsers(finacleUsersForTest.map((u) => u.id));

  }
};

const toggleSingleUser = (id) => {
  setSelectedTestUsers((prev) =>
    prev.includes(id)
      ? prev.filter((uid) => uid !== id)
      : [...prev, id]
  );
};





// ─────────────────────────────────────────────
// ⭐ HANDLE DELETE TEST PDF
// ─────────────────────────────────────────────
// This function:
// 1. Shows confirmation popup
// 2. Calls backend delete API
// 3. Removes PDF card from UI
// 4. Resets selected test if needed
// ------------------------------------------------

const handleDeleteTestPdf = async (doc) => {
  // Ask confirmation before deleting
  const confirmDelete = window.confirm(
    `Are you sure you want to delete "${doc.title}"?`
  );

  if (!confirmDelete) return;

  try {
    // Extract filename from URL
    const fileName = doc.url.split("/").pop();

    // Call backend delete API
    const res = await axios.delete(
      `${BACKEND_URL}/api/admin/delete-test-pdf/${fileName}`
    );

    if (res.data.ok) {
      // ✅ Remove deleted PDF from UI list
      setTestDocs((prev) =>
        prev.filter((d) => d.name !== doc.name)
      );

      // Reset selection if deleted PDF was selected
      if (selectedTestDoc?.name === doc.name) {
        setSelectedTestDoc(null);
        setSelectedTestUsers([]);
      }

      alert("✅ PDF deleted successfully");
    }
  } catch (err) {
    console.error("❌ Delete failed:", err);
    alert("❌ Failed to delete PDF");
  }
};



useEffect(() => {
  axios
    .get(`${BACKEND_URL}/api/evaluation/reports`)
    .then((res) => {
      if (res.data.ok) {
        setEvaluationReports(res.data.reports || []);
      }
    })
    .catch((err) => console.error("Failed to load reports", err));
}, []);


useEffect(() => {
  if (!selectedTestDoc) return;

  axios
    .get(`${BACKEND_URL}/api/test/status/${selectedTestDoc.name}`)
    .then((res) => {
      if (res.data.ok) setTestStatuses(res.data.statuses);
    });
}, [selectedTestDoc]);


const handleResetTest = async (userId) => {
  if (!window.confirm("Reset this user's assessment?")) return;

  try {
    const res = await axios.post(`${BACKEND_URL}/api/test/reset`, {
      testId: selectedTestDoc.name,
      userId,
    });

    if (!res.data.ok) throw new Error();

    // Remove completed status
    setTestStatuses((prev) => {
      const updated = { ...prev };
      delete updated[userId];
      return updated;
    });

    // Enable checkbox again
    setSelectedTestUsers((prev) =>
      prev.includes(userId) ? prev : [...prev, userId]
    );

    alert("✅ Re-test enabled");
  } catch (err) {
    console.error(err);
    alert("❌ Re-test failed");
  }
};


  // ------------------------------------------------------------------
  // LOAD USERS ON MOUNT
  // ------------------------------------------------------------------
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}${API_ROUTES.users}`);
      if (res.data.ok) setUsers(res.data.users);
    } catch (err) {
      console.error("Fetch users error:", err);
    }
  };


  useEffect(() => {
  if (activeModule === "temp") {
    loadTemporaryChats();
    setShowTempChatsPanel(true);
  } else {
    setShowTempChatsPanel(false);
  }
}, [activeModule]);


// ================= LOAD TEST DOCS =================
  useEffect(() => {
    if (activeModule === "test") {
      loadTestDocuments();
    }
  }, [activeModule]);

  const loadTestDocuments = async () => {
    const res = await getTestDocuments();
    console.log("TEST DOCS:", res);
    if (res.ok) setTestDocs(res.documents);
  };


  // ================= UPLOAD HANDLER =================
const handleUploadTraining = async () => {
  try {
    setUploadMsg("");

    if (!uploadCategory || !uploadDay) {
      setUploadMsg("Category and Day are required");
      return;
    }

    // Save day title
    await axios.post(
      `${BACKEND_URL}/api/${uploadCategory}/daywise-topics`,
      { day: uploadDay, title: uploadTitle }
    );

    const formData = new FormData();
    formData.append("category", uploadCategory);
    formData.append("day", uploadDay);
    formData.append("title", uploadTitle);
    formData.append("language", uploadLanguage);

    // FINACLE → send language videos
if (uploadCategory === "finacle") {
  Object.entries(uploadVideos).forEach(([lang, file]) => {
    if (file) {
      formData.append(`video_${lang}`, file);
    }
  });
}

// FULLSTACK & DATASCIENCE → send ONE video
else if (singleVideo) {
  formData.append("video_english", singleVideo);
}


    if (uploadPdf) formData.append("pdf", uploadPdf);
    if (uploadImage && !removeImage) {formData.append("image", uploadImage);}

    const res = await axios.post(
      `${BACKEND_URL}/api/admin/upload-training`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );

    if (res.data.ok) {
      setUploadMsg("✅ Upload successful");

      setUploadTitle("");
      setUploadDay("");
      setUploadPdf(null);
      setUploadImage(null);
      setExistingImage(null);
      setRemoveImage(false);
      setSingleVideo(null);
      setUploadVideos({
        english: null,
        tamil: null,
        telugu: null,
        kannada: null,
      });
    }
  } catch (err) {
    console.error(err);
    setUploadMsg("❌ Upload failed");
  }
};




  // ------------------------------------------------------------------
  // TEMP CHAT TOGGLE STATE FROM BACKEND
  // ------------------------------------------------------------------
  useEffect(() => {
    async function loadReceiveStatus() {
      try {
        const res = await getTempChatStatus();
        if (res.ok) setTempReceiveEnabled(res.enabled);
      } catch (err) {
        console.error("Error loading receive status:", err);
      }
    }
    loadReceiveStatus();
  }, []);

  // ------------------------------------------------------------------
  // TEMP CHATS
  // ------------------------------------------------------------------
  const loadTemporaryChats = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}${API_ROUTES.tempAll}`);
      if (res.data.ok) setTempChats(res.data.messages);
    } catch (err) {
      console.error(err);
    }
  };

  const approveTemp = async (id) => {
    try {
      await axios.post(`${BACKEND_URL}${API_ROUTES.tempApprove}/${id}`);
      loadTemporaryChats();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteTemp = async (id) => {
    try {
      await axios.delete(`${BACKEND_URL}${API_ROUTES.tempDelete}/${id}`);
      loadTemporaryChats();
    } catch (err) {
      console.error(err);
    }
  };

  // ------------------------------------------------------------------
  // ADD USER
  // ------------------------------------------------------------------
  const handleAddUser = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!name || !email || !password || (role === "employee" && !id)) {
      setMsg("All fields required.");
      return;
    }

    try {
      const res = await axios.post(`${BACKEND_URL}${API_ROUTES.users}`, {
  id: role === "employee" ? id : null,
  name,
  email,
  password,
  role,        // admin / employee
  domain,      // finacle / fullstack / datascience ✅
});


      if (res.data.ok) {
        setMsg("User added.");
        setId("");
        setName("");
        setEmail("");
        setPassword("");
        setRole("employee");
        setShowForm(false);
        fetchUsers();
      }
    } catch (err) {
      setMsg(err?.response?.data?.error || "Error adding user.");
    }
  };

// ---------------------------
// UPDATE USER
// ---------------------------
const handleUpdateUser = async (e) => {
  e.preventDefault();
  setMsg("");

  try {
    const res = await axios.put(
      `${BACKEND_URL}${API_ROUTES.users}/${editingUserData.id}`,
      {
        name: editingUserData.name,
        email: editingUserData.email,
        password: editingUserData.password_plain,
      }
    );

    if (res.data.ok) {
      setMsg("User updated successfully.");
      setEditingUserData(null);
      fetchUsers();
    }

  } catch (err) {
    console.error(err);
    setMsg("Error updating user.");
  }
};

  
  // ------------------------------------------------------------------
  // DELETE USER (CONFIRM MODAL)
  // ------------------------------------------------------------------
  const confirmDeleteUser = async () => {
    if (!deleteUserData) return;

    try {
      const res = await axios.delete(
        `${BACKEND_URL}${API_ROUTES.users}/${deleteUserData.id}`
      );

      if (res.data.ok) {
        setMsg("User deleted successfully.");
        setDeleteUserData(null);
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
      setMsg("Error deleting user.");
    }
  };

  // ------------------------------------------------------------------
  // USER CHAT HISTORY
  // ------------------------------------------------------------------
  const loadUserHistory = async (user) => {
    try {
      const res = await axios.get(
        `${BACKEND_URL}${API_ROUTES.userHistory}/${user.email}`
      );

      if (res.data.ok) {
        setHistoryUser(user);
        setUserSessions(res.data.sessions || []);
        setSelectedSession(null);
        setSessionMessages([]);
      }
    } catch (err) {
      console.error("Load history error:", err);
    }
  };

  const loadSessionMessages = async (sessionId) => {
    if (!historyUser) return;

    try {
      const res = await axios.get(
        `${BACKEND_URL}${API_ROUTES.userHistory}/${historyUser.email}/${sessionId}`
      );

      if (res.data.ok) {
        setSelectedSession(sessionId);
        setSessionMessages(res.data.messages || []);
      }
    } catch (err) {
      console.error("Load session messages error:", err);
    }
  };

  const handleTestPdfUpload = async () => {
  if (!testPdfFile) return;

  try {
    setUploading(true);

    const formData = new FormData();
    formData.append("pdf", testPdfFile);

    const res = await axios.post(
      `${BACKEND_URL}/api/admin/upload-test-pdf`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );

    if (res.data.ok) {
      alert("✅ PDF uploaded successfully");
      setShowTestUpload(false);
      setTestPdfFile(null);
      loadTestDocuments(); // refresh list
    }
  } catch (err) {
    alert("❌ Upload failed");
  } finally {
    setUploading(false);
  }
};


  // ===== GET BASE 1–60 DAYS =====
const getBaseDays = () => Array.from({ length: 60 }, (_, i) => i + 1);

// ===== LOAD DAYS (BASE + ADDED) =====
const loadDaysForCategory = async (category) => {
  try {
    const res = await axios.get(
      `${BACKEND_URL}/api/${category}/max-day`
    );

    const maxDay = res.data.maxDay || 0;

    setDayCount(maxDay);
    setAvailableDays(
      Array.from({ length: maxDay }, (_, i) => i + 1)
    );
  } catch (err) {
    console.error("Failed to load days", err);
    setAvailableDays([]);
    setDayCount(0);
  }
};


const loadDayTitlesFromBackend = async (category) => {
  try {
    const res = await axios.get(
      `${BACKEND_URL}/api/${category}/daywise-topics`
    );

    if (res.data.ok) {
      setDayTitles(res.data.data || {});
    }
  } catch (err) {
    console.error("Failed to load day titles", err);
    setDayTitles({});
  }
};

// asigning test

const handleAssignTest = async () => {
  try {
    if (!selectedTestDoc || selectedTestUsers.length === 0) return;

    const pdfFileName = selectedTestDoc.url.split("/").pop();

await assignTest(
  selectedTestDoc.name,   // testId
  pdfFileName,            // ⭐ PDF filename
  selectedTestUsers
);



    alert("✅ Test assigned successfully");

    // reset state
    setSelectedTestDoc(null);
    setSelectedTestUsers([]);
  } catch (err) {
    console.error("Assign test error:", err);
    alert("❌ Failed to assign test");
  }
};




// ===== ADD NEW DAY (61, 62, ...) =====
const addNewDay = async () => {
  const nextDay = dayCount + 1;

  setDayCount(nextDay);
  setAvailableDays(
    Array.from({ length: nextDay }, (_, i) => i + 1)
  );

  setSelectedDay(nextDay);
  setUploadDay(nextDay);
  setUploadTitle("");
  setIsNewDay(true);
};




  // ------------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------------

  return (
    <div>
      <ImageModal src={modalImage} onClose={() => setModalImage(null)} />

      {/* NAVBAR */}
      <nav className="navbar navbar-light bg-white shadow-sm px-4 d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <img
            src="/src/images/logo_company.png"
            alt="logo"
            style={{ width: 80 }}
          />
          <span className="ms-3 fs-2 fw-bold" style={{ color: "#00a693" }}>
            Immortal Future Infotech
          </span>
        </div>

       <div className="admin-right">
  <div style={{ fontWeight: 600 }}>{adminEmail}</div>
  <div style={{ fontSize: 12, color: "#666" }}>Admin</div>

  <button
    onClick={() => {
      localStorage.clear();
      window.location.href = "/";
    }}
    className="btn btn-sm mt-1"
    style={{
      backgroundColor: "#fa0808ff",
      color: "white",
      fontWeight: 600,
    }}
  >
    Logout
  </button>
</div>


      </nav>

      {/* TOP MODULE BUTTONS */}
<div className="d-flex justify-content-center gap-3 admin-top-buttons mt-3">
  <button
    className={`btn admin-top-btn users ${
      activeModule === "users" ? "active" : ""
    }`}
    onClick={() => {
  setActiveModule("users");
  setShowTempChatsPanel(false);
}}
  >
    <PersonAddIcon style={{ marginRight: 9 }} />
    Add User
  </button>

  <button
    className={`btn admin-top-btn temp ${
      activeModule === "temp" ? "active" : ""
    }`}
    onClick={() => {
  setActiveModule("temp");
  setShowTempChatsPanel(false); // ✅ reset dropdown
}}

  >
    <ChatIcon style={{ marginRight: 9 }} />
    Temporary Chats
  </button>

  <button
    className={`btn admin-top-btn upload ${
      activeModule === "upload" ? "active" : ""
    }`}
    onClick={() => {
  setActiveModule("upload");
  setShowTempChatsPanel(false);
}}
  >
    <UploadFileIcon style={{ marginRight: 9 }} />
    Upload Document
  </button>

  {/* ✅ CREATE TEST (NEW) */}
  <button
          className={`btn admin-top-btn test  ${
            activeModule === "test" ? "active" : ""
          }`}
          onClick={() => setActiveModule("test")}
        >
          <AssignmentIcon /> Create Test
        </button>

       {/* ================= EVALUATION ================= */}
{/* ✅ EVALUATION */}
<button
  className={`btn admin-top-btn evaluation ${
    activeModule === "evaluation" ? "active" : ""
  }`}
  onClick={() => {
    setActiveModule("evaluation");
    setShowTempChatsPanel(false);
  }}
>
  <AssignmentTurnedInIcon style={{ marginRight: 9 }} />
  Evaluation
</button>



</div>



      {/* ---- CONTENT ---- */}
      {activeModule === "users" && (
      <div className="p-4">
        {/* HEADER */}
        <div
          className="d-flex justify-content-between align-items-center mt-1"
          style={{ width: "100%" }}
        >
          <h3 className="fw-bold" style={{ color: "#00a693", margin: 0 }}>
            All Users
          </h3>

          <button
            className="btn"
            style={{
              backgroundColor: "#00a693",
              color: "white",
              fontWeight: 600,
            }}
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? (
              "Close Form"
            ) : (
              <>
                <AddIcon style={{ marginRight: 6 }} />
                Add User
              </>
            )}
          </button>
        </div>

        {msg && <div className="alert alert-info mt-2">{msg}</div>}

        {/* ADD USER FORM */}
        {showForm && (
          <div
            className="d-flex justify-content-center mt-3"
            style={{ width: "100%" }}
          >
            <div
              className="p-4 shadow rounded"
              style={{
                width: "850px",
                background: "white",
                borderRadius: "12px",
                border: "1px solid #e5e5e5",
              }}
            >
              <div
                style={{
                  backgroundColor: "#00a693",
                  padding: "10px 15px",
                  borderRadius: "8px",
                  marginBottom: "20px",
                }}
              >
                <h5 className="text-white m-0 fw-bold">Add New User</h5>
              </div>

              <form onSubmit={handleAddUser}>
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Role <span style={{ color: "red" }}>*</span>
                  </label>
                  <select
                    className="form-control"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {role === "employee" && (
                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Employee ID <span style={{ color: "red" }}>*</span>
                    </label>
                    <input
                      className="form-control"
                      value={id}
                      placeholder="Enter unique ID"
                      onChange={(e) => setId(e.target.value)}
                    />
                  </div>
                )}

                <div className="mb-3">
  <label className="form-label fw-semibold">
    Role / Domain <span style={{ color: "red" }}>*</span>
  </label>
  <select
    className="form-control"
    value={domain}
    onChange={(e) => setDomain(e.target.value)}
  >
    <option value="finacle">Finacle</option>
    <option value="fullstack">Full Stack</option>
    <option value="datascience">Data Science</option>
  </select>
</div>


                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Name <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    className="form-control"
                    value={name}
                    placeholder="Enter full name"
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Email <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    value={email}
                    placeholder="example@gmail.com"
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="mb-3 position-relative">
                  <label className="form-label fw-semibold">
                    Password <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    type={showPwd ? "text" : "password"}
                    className="form-control"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingRight: "40px" }}
                  />
                  <span
                    onClick={() => setShowPwd(!showPwd)}
                    style={{
                      position: "absolute",
                      top: "38px",
                      right: "12px",
                      cursor: "pointer",
                      color: "#00a693",
                      fontSize: "18px",
                    }}
                  >
                    {showPwd ? (
                      <VisibilityOffIcon style={{ color: "#00a693" }} />
                    ) : (
                      <VisibilityIcon style={{ color: "#00a693" }} />
                    )}
                  </span>
                </div>

                <button
                  type="submit"
                  className="btn px-4"
                  style={{
                    backgroundColor: "#00a693",
                    color: "white",
                    fontWeight: 600,
                    borderRadius: "6px",
                  }}
                >
                  Save User
                </button>
              </form>
            </div>
          </div>
        )}

        {/* USERS TABLE */}
       <div className="admin-table-wrapper mt-4 responsive-table">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Password</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created At</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
  {users.map((u) => (
    <tr key={u.id}>
  <td>{u.id}</td>
  <td>{u.name}</td>
  <td>{u.email}</td>
{/* Password */}
      <td data-label="Password">
        <div style={{ position: "relative", width: "180px" }}>
          <input
            type={u.show ? "text" : "password"}
            value={u.password_plain}
            readOnly
            className="form-control"
            style={{
              paddingRight: "35px",
              fontSize: "14px",
            }}
          />

          <span
            onClick={() => {
              setUsers((prev) =>
                prev.map((x) =>
                  x.id === u.id ? { ...x, show: !x.show } : x
                )
              );
            }}
            style={{
              position: "absolute",
              right: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              cursor: "pointer",
            }}
          >
            {u.show ? (
              <VisibilityOffIcon style={{ color: "#00a693" }} />
            ) : (
              <VisibilityIcon style={{ color: "#00a693" }} />
            )}
          </span>
        </div>
      </td>

      <td data-label="Role">{u.domain}</td>




      {/* Status */}
      <td
        data-label="Status"
        style={{
          fontWeight: 700,
          color: u.status === "active" ? "green" : "red",
        }}
      >
        {u.status}
      </td>

      {/* Created At */}
      <td data-label="Created At">
        {new Date(u.created_at).toLocaleString()}
      </td>

      {/* Actions */}
      <td data-label="Actions">
        <div className="actions d-flex justify-content-center gap-3">
          <button
            onClick={() => setEditingUserData(u)}
            className="btn btn-light p-1"
            style={{ borderRadius: "6px" }}
          >
            <EditIcon style={{ color: "#00a693" }} />
          </button>

          <button
            onClick={() => setDeleteUserData(u)}
            className="btn btn-light p-1"
            style={{ borderRadius: "6px" }}
          >
            <DeleteIcon style={{ color: "red" }} />
          </button>

          <button
            onClick={() => loadUserHistory(u)}
            className="btn btn-light p-1"
            style={{ borderRadius: "6px" }}
          >
            <HistoryIcon style={{ color: "#007bff" }} />
          </button>
        </div>
      </td>

    </tr>
  ))}
</tbody>

          </table>
        </div>
      </div>
      )}

      {activeModule === "evaluation" && (
  <div className="p-4">
    <AdminEvaluation />
  </div>
)}


      {/* TEMP CHAT PANEL */}
      {activeModule === "temp" && (
      <div className="mb-3 ms-4 mt-4" style={{ position: "relative" }}>
        <button
          className="btn"
          style={{ backgroundColor: "#00a693", color: "white" }}
          onClick={async () => {
            await loadTemporaryChats();
            setShowTempChatsPanel((prev) => !prev);
          }}
        >
          Temporary Chats ▼
        </button>

        {/* Toggle ON/OFF */}
        <button
          onClick={async () => {
            const newState = !tempReceiveEnabled;
            setTempReceiveEnabled(newState);
            await setTempChatReceiving(newState);
          }}
          style={{
            padding: "8px 14px",
            borderRadius: "6px",
            marginLeft: "20px",
            backgroundColor: tempReceiveEnabled ? "#dc3545" : "#28a745",
            color: "white",
            fontWeight: "700",
            border: "none",
            cursor: "pointer",
          }}
        >
          {tempReceiveEnabled ? "Stop Receiving" : "Start Receiving"}
        </button>

        {showTempChatsPanel && (
          <div
            className="p-3 temp-chat-panel"
            style={{
              position: "absolute",
              background: "white",
              border: "2px solid #00a693",
              borderRadius: "10px",
              width: "1550px",
              maxHeight: "950px",
              overflowY: "auto",
              zIndex: 999,
              marginTop: "5px",
            }}
          >
            <h5 className="fw-bold mb-3">Temporary Chats</h5>

            {tempChats.length === 0 && (
              <p className="text-muted">No temporary chats found.</p>
            )}

            {tempChats.map((pair) => (
              <div
                key={pair.id}
                className="p-2 mb-3  temp-chat-card"
                style={{
                  border: "1px solid #00a693",
                  boxShadow: "0 2px 10px rgba(0,0,0)",
                  borderRadius: "6px",
                  background: "#f9fffc",
                  position: "relative",
                  paddingRight: "140px",
                }}
              >
                {/* USER */}
                <div>
                  <strong>User:</strong>
                  <br />
                  <div style={{ color: "red", fontWeight: "600" }}>
                    {pair.user}
                  </div>
                </div>

                {/* AI */}
                <div style={{ marginTop: "10px" }}>
                  <strong>AI:</strong>

                  <div
                    className="markdown-container ai-box"
                    style={{
                      border: "1px solid #d9f3eb",
                      background: "#f3fffa",
                      padding: "10px",
                      borderRadius: "6px",
                      marginTop: "5px",
                      width: "1040px",
                    }}
                  >
                    {/* TEXT */}
                    
                  {pair.ai?.text && (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      p: ({ children }) => (
        <p style={{ margin: "6px 0", lineHeight: "1.55" }}>
          {children}
        </p>
      ),
      strong: ({ children }) => (
        <strong style={{ fontWeight: "700", color: "#000" }}>
          {children}
        </strong>
      ),
      li: ({ children }) => (
        <li style={{ marginBottom: "4px" }}>{children}</li>
              ),
            }}
          >
            {pair.ai.text}
          </ReactMarkdown>
        )}

                {/* TABLE */}
                {pair.ai?.tables?.length > 0 && (
                  <div style={{ marginTop: "8px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {pair.ai.tables.map((tbl, idx) => (
                      <button
                        key={idx}
                        className="btn btn-outline-success btn-sm"
                        onClick={() => {
                          setModalImage(`${BACKEND_URL}${tbl.path}`);
                        }}
                      >
                        TABLE {idx + 1}
                      </button>
                    ))}
                  </div>
                )}

                {/* IMAGE */}
                {pair.ai?.images?.length > 0 && (
                  <div style={{ marginTop: "8px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {pair.ai.images.map((img, idx) => (
                      <button
                        key={idx}
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => {
                          setModalImage(`${BACKEND_URL}${img.path}`);
                        }}
                      >
                        IMAGE {idx + 1}
                      </button>
                    ))}
                  </div>
                )}
                  </div>
                </div>

                {/* Buttons */}
              <div
                className="action-buttons"
                style={{
                  position: "absolute",
                  right: "105px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  display: "flex",
                  gap: "10px",
                }}
              >

                  <button
                    className="btn btn-success btn-sm fw-semibold"
                    style={{ borderRadius: "50px", padding: "6px 15px" }}
                    onClick={() => approveTemp(pair.id)}
                  >
                    ✓ Approve
                  </button>

                  <button
                    className="btn btn-danger btn-sm fw-semibold"
                    style={{ borderRadius: "50px", padding: "6px 15px" }}
                    onClick={() => deleteTemp(pair.id)}
                  >
                    ✗ Decline
                  </button>
                </div>
              </div>
            ))}

            <div className="text-end">
              <button
                className="btn btn-danger btn-sm"
                onClick={() => setShowTempChatsPanel(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* ================= CREATE TEST ================= */}
{activeModule === "test" && (
  <div className="p-4">

    <div className="d-flex justify-content-between align-items-center mb-3">
  <h3 className="fw-bold" style={{ color: "#00a693" }}>
    Test Question PDF's
  </h3>

  <button
    className="btn"
    style={{
      backgroundColor: "#00a693",
      color: "#fff",
      fontWeight: 600,
    }}
    onClick={() => setShowTestUpload(true)}
  >
    <UploadFileIcon style={{ marginRight: 6 }} />
    Upload PDF
  </button>
</div>


    {testDocs.length === 0 ? (
      <p className="text-muted">No test documents found.</p>
    ) : (
      <div className="d-flex gap-4 flex-wrap">
       {testDocs.map((doc) => (
  <div
    key={doc.name}
    onClick={() => {
      setSelectedTestDoc(doc);
      setSelectedTestUsers([]);
    }}
    style={{
      width: "140px",
      cursor: "pointer",
      textAlign: "center",
      padding: "10px",
      borderRadius: "10px",
      position: "relative", // ⭐ REQUIRED for absolute ❌
      border:
        selectedTestDoc?.name === doc.name
          ? "2px solid #00a693"
          : "1px solid #ddd",
      backgroundColor:
        selectedTestDoc?.name === doc.name
          ? "#e6f7f4"
          : "#ffffff",
    }}
  >

    {/* ─────────────────────────────────────
        ❌ DELETE TEST PDF (TOP-RIGHT)
        • Stops card click
        • Calls backend delete API
       ───────────────────────────────────── */}
    <span
      onClick={(e) => {
        e.stopPropagation(); // prevent card select
        handleDeleteTestPdf(doc);
      }}
      style={{
        position: "absolute",
        top: "6px",
        right: "6px",
        background: "#ff0000",
        color: "#ffffff",
        borderRadius: "50%",
        width: "22px",
        height: "22px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "14px",
        fontWeight: "bold",
        cursor: "pointer",
        zIndex: 10,
      }}
    >
      ✕
    </span>

    {/* 📄 PDF ICON */}
    <DescriptionIcon style={{ fontSize: 70, color: "#00a693" }} />

    {/* 📄 PDF TITLE */}
    <div className="mt-2 fw-semibold">{doc.title}</div>

    {/* 👁 PREVIEW LINK */}
    <div
      style={{
        color: "#f80b0bff",
        fontSize: "14px",
        cursor: "pointer",
        marginTop: "4px",
      }}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedTestDoc(doc);
        setShowPreview(true);
      }}
    >
      Preview
    </div>

          </div>
        ))}
      </div>
    )}

 {selectedTestDoc && (
  <div className="mt-5 d-flex justify-content-center">
    <div
      style={{
        width: "520px",
        background: "#ffffff",
        borderRadius: "14px",
        padding: "24px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
      }}
    >
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="fw-bold mb-0" style={{ color: "#00a693" }}>
          Assign User
        </h5>

        {/* ALL USERS */}
        <div
          onClick={toggleAllUsers}
          style={{
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontWeight: 500,
            color: "#04352d",
          }}
        >
          <input
            type="checkbox"
            checked={isAllSelected}
            readOnly
          />
          All Users
        </div>
      </div>

      {/* USER LIST */}
      <div className="table-responsive">
        <table className="table align-middle mb-0">
          <thead>
  <tr style={{ backgroundColor: "#f8f9fa" }}>
    <th style={{ width: "60px" }}></th>
    <th>User Name</th>
    <th>Status</th>
  </tr>
</thead>

          <tbody>
           {finacleUsersForTest.map((u) => {
              const isChecked = selectedTestUsers.includes(u.id);
               // ✅ THIS WAS MISSING
  const userReport = evaluationReports.find(
    (r) =>
      r.testName === selectedTestDoc.name &&
      r.userName === u.name
  );
              return (
               <tr key={u.id}>
  <td>
    <input
      type="checkbox"
      disabled={testStatuses?.[u.id] === "completed"}
      checked={selectedTestUsers.includes(u.id)}
      onChange={() => toggleSingleUser(u.id)}
    />
  </td>

  <td style={{ fontWeight: 500 }}>{u.name}</td>

<td>
  {testStatuses?.[u.id] === "completed" ? (
    <>
      <span style={{ color: "green", fontWeight: 600 }}>
        Completed
      </span>

      <button
        className="btn btn-sm btn-outline-danger ms-2"
        onClick={() => handleResetTest(u.id)}
      >
        Re-test
      </button>
    </>
  ) : (
    <span>Not Assigned</span>
  )}
</td>

</tr>


              );
            })}
          </tbody>
        </table>
      </div>

      {/* UPDATE BUTTON */}
      <button
  className="btn w-100 mt-4"
  disabled={selectedTestUsers.length === 0}
  onClick={handleAssignTest}
  style={{
    backgroundColor: "#00a693",
    color: "#fff",
    fontWeight: 600,
    padding: "10px",
    borderRadius: "10px",
  }}
>
  Assign
</button>

    </div>
  </div>
)}



  </div>
)}

{showPreview && selectedTestDoc && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      backdropFilter: "blur(6px)",
      zIndex: 1300,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
    }}
    onClick={() => setShowPreview(false)}
  >
    <div
      style={{
        width: "80%",
        maxWidth: "1000px",
        height: "85vh",
        backgroundColor: "#fff",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
        display: "flex",
        flexDirection: "column",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* HEADER */}
      <div
        style={{
          padding: "12px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #eee",
          backgroundColor: "#f9f9f9",
        }}
      >
        <h6
          style={{
            margin: 0,
            fontWeight: 600,
            color: "#04352d",
          }}
        >
          {selectedTestDoc.title}
        </h6>

        {/* CLOSE ICON */}
        <span
          onClick={() => setShowPreview(false)}
          style={{
            cursor: "pointer",
            fontSize: "22px",
            fontWeight: "bold",
            color: "#f51111ff",
            lineHeight: 1,
          }}
          title="Close"
        >
          ✕
        </span>
      </div>

      {/* PDF BODY */}
      <div style={{ flex: 1, backgroundColor: "#333" }}>
       <iframe
  src={`${BACKEND_URL}${selectedTestDoc.url}#toolbar=0&navpanes=0&scrollbar=0`}
  title="pdf-preview"
  width="100%"
  height="100%"
  style={{
    border: "none",
    backgroundColor: "#fff",
  }}
/>

      </div>
    </div>
  </div>
)}

{showTestUpload && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2000,
    }}
    onClick={() => setShowTestUpload(false)}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        width: "420px",
        background: "#fff",
        padding: "24px",
        borderRadius: "12px",
        textAlign: "center",
      }}
    >
      <h5 className="fw-bold mb-3">Upload Test PDF</h5>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file && file.type === "application/pdf") {
            setTestPdfFile(file);
          }
        }}
        style={{
          border: "2px dashed #00a693",
          borderRadius: "10px",
          padding: "30px",
          cursor: "pointer",
        }}
      >
        <p>Drag & drop PDF here</p>
        <p className="text-muted">or</p>

        <label className="btn btn-outline-success">
          Browse PDF
          <input
            type="file"
            hidden
            accept="application/pdf"
            onChange={(e) => setTestPdfFile(e.target.files[0])}
          />
        </label>

        {testPdfFile && (
          <div className="mt-2 fw-semibold">
            {testPdfFile.name}
          </div>
        )}
      </div>

      <button
        className="btn w-100 mt-3"
        disabled={!testPdfFile || uploading}
        onClick={handleTestPdfUpload}
        style={{
          backgroundColor: "#00a693",
          color: "#fff",
          fontWeight: 600,
        }}
      >
        {uploading ? "Uploading..." : "Upload"}
      </button>
    </div>
  </div>
)}



      {/* upload documents */}

    {activeModule === "upload" && (
  <div className="p-4 d-flex justify-content-center">
    <div className="upload-ui-card">

      {/* HEADER */}
      <div className="upload-ui-header">
        <h4>Upload Training Document</h4>
        <p>Select module → choose day → upload files</p>
      </div>

      {uploadMsg && (
        <div className="alert alert-info py-2">{uploadMsg}</div>
      )}

      {/* CATEGORY */}
      <div className="upload-section">
        <label className="upload-label">
          Category <span>*</span>
        </label>

        <select
          className="form-control upload-input"
          value={uploadCategory}
          onChange={async (e) => {
  const value = e.target.value;

  setUploadCategory(value);
  setSelectedDay(null);
  setUploadDay("");
  setUploadTitle("");
  setIsNewDay(false);

  if (value) {
    await loadDaysForCategory(value);
    await loadDayTitlesFromBackend(value);
  }
}}

        >
          <option value="">Select module</option>
          <option value="finacle">Finacle</option>
          <option value="fullstack">Full Stack</option>
          <option value="datascience">Data Science</option>
        </select>
      </div>

      {/* DAYS */}
      {uploadCategory && (
        <div className="upload-section">
          <label className="upload-label">
            Select Day <span>*</span>
          </label>

          <div className="day-ui-grid">
            {availableDays.map((day) => (
              <button
                key={day}
                className={`day-ui-btn ${
                  selectedDay === day ? "active" : ""
                }`}
               onClick={() => {
  setSelectedDay(day);
  setUploadDay(day);
  loadDayImage(uploadCategory, day); // ⭐ IMPORTANT

  if (dayTitles[day]) {
    setUploadTitle(dayTitles[day].title);
    setIsNewDay(false);
  } else {
    setUploadTitle("");
    setIsNewDay(true);
  }
}}

              >
                {day}
              </button>
            ))}

            <button className="day-ui-btn add" onClick={addNewDay}>
              +
            </button>
          </div>
        </div>
      )}

      {/* TITLE */}
      {selectedDay && (
        <div className="upload-section">
          <label className="upload-label">Title</label>
          <input
  className="form-control upload-input1"
  value={uploadTitle}
  onChange={(e) => setUploadTitle(e.target.value)}
  placeholder="Enter day title"
/>

        </div>
      )}
    
      {/* IMAGE UPLOAD */}
    {selectedDay && (
      <div className="upload-section">
        <label className="upload-label">Schedule Image</label>
    
        <div
          style={{
            width: "260px",
            border: "2px dashed #00a693",
            borderRadius: "10px",
            padding: "10px",
            position: "relative",
          }}
        >
          {existingImage && !removeImage ? (
            <div style={{ position: "relative" }}>
             <img
      src={existingImage}
      alt="day"
      onClick={() => setModalImage(existingImage)}
      style={{
        width: "100%",
        borderRadius: "8px",
        cursor: "pointer",
      }}
    />
    
    
              {/* ❌ DELETE IMAGE */}
              <span
                onClick={async () => {
                  await axios.delete(
                    `${BACKEND_URL}/api/${uploadCategory}/day-image/${selectedDay}`
                  );
                  setExistingImage(null);
                  setRemoveImage(true);
                }}
                style={{
                  position: "absolute",
                  top: "6px",
                  right: "6px",
                  width: "22px",
                  height: "22px",
                  background: "red",
                  color: "white",
                  borderRadius: "50%",
                  fontWeight: "bold",
                  fontSize: "14px",
                  textAlign: "center",
                  cursor: "pointer",
                  lineHeight: "22px",
                }}
              >
                ✕
              </span>
            </div>
          ) : (
            <label
              style={{
                display: "block",
                textAlign: "center",
                color: "#00a693",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              + Add Image
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={(e) => setUploadImage(e.target.files[0])}
              />
            </label>
          )}
        </div>
      </div>
    )}
    


      {/* FILE UPLOADS */}
{selectedDay && (
  <div className="upload-section">
    <label className="upload-label">Upload Files</label>

    <div className="separate-dropzone-grid">

      {/* PDF UPLOAD */}
      <div
        className="dropzone-box"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file && file.type.includes("pdf")) {
            setUploadPdf(file);
          }
        }}
      >
        <div className="dropzone-content">
          <div className="dropzone-text">
            Choose a PDF or drag & drop it here
          </div>
          <div className="dropzone-hint">
            PDF format, up to 50MB
          </div>

          <label className="browse-btn">
            Browse PDF
            <input
              type="file"
              hidden
              accept="application/pdf"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) setUploadPdf(file);
              }}
            />
          </label>

          {uploadPdf && (
            <div className="selected-file">
            {uploadPdf.name}
            </div>
          )}
        </div>
      </div>

  
{/* VIDEO UPLOAD */}
<div
  className="dropzone-box"
  onDragOver={(e) => e.preventDefault()}
  onDrop={(e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("video")) {
      if (uploadCategory === "finacle") {
        setUploadVideos((prev) => ({ ...prev, english: file }));
      } else {
        setSingleVideo(file);
      }
    }
  }}
>
  <div className="dropzone-content">
    <div className="dropzone-text">
      Choose a Video or drag & drop it here
    </div>

    <div className="dropzone-hint">
      MP4 / MKV / WEBM, up to 500MB
    </div>

    {/* FINACLE → LANGUAGE WISE */}
   {uploadCategory === "finacle" ? (
  <div className="video-lang-grid">
    {["english", "tamil", "telugu", "kannada"].map((lang) => (
      <div key={lang} className="video-lang-card">
        <div className="video-lang-title">
         {lang.toUpperCase()}
        </div>

        <label className="video-lang-btn">
          Browse
          <input
            type="file"
            hidden
            accept="video/*"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                setUploadVideos((prev) => ({
                  ...prev,
                  [lang]: file,
                }));
              }
            }}
          />
        </label>

        {uploadVideos[lang] && (
          <div className="video-lang-file">
            {uploadVideos[lang].name}
          </div>
        )}
      </div>
    ))}
  </div>
) : (
  <div className="video-lang-card single">
    <div className="video-lang-title">VIDEO</div>

    <label className="video-lang-btn">
      Browse Video
      <input
        type="file"
        hidden
        accept="video/*"
        onChange={(e) => {
          const file = e.target.files[0];
          if (file) setSingleVideo(file);
        }}
      />
    </label>

    {singleVideo && (
      <div className="video-lang-file">
        {singleVideo.name}
      </div>
    )}
  </div>
)}
</div>
</div>



      {/* IMAGE UPLOAD */}
      <div
        className="dropzone-box"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file && file.type.includes("image")) {
            setUploadImage(file);
          }
        }}
      >
        <div className="dropzone-content">
          <div className="dropzone-text">
            Choose an Image or drag & drop it here
          </div>
          <div className="dropzone-hint">
            JPG / PNG format, up to 50MB
          </div>

          <label className="browse-btn">
            Browse Image
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) setUploadImage(file);
              }}
            />
          </label>

          {uploadImage && (
            <div className="selected-file">
              {uploadImage.name}
            </div>
          )}
        </div>
      </div>

    </div>

    <div className="text-end mt-4">
      <button className="upload-ui-btn" onClick={handleUploadTraining}>
        Upload Document
      </button>
    </div>
  </div>
)}



    </div>
  </div>
)}

      

      {/* ============ EDIT USER MODAL ============ */}
      {editingUserData && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 10000,
          }}
        >
          <div
            style={{
              width: "420px",
              background: "white",
              borderRadius: "12px",
              padding: "20px 22px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            }}
          >
            <h4 className="fw-bold mb-3" style={{ color: "#00a693" }}>
              Edit User
            </h4>

            <form onSubmit={handleUpdateUser}>
              <div className="mb-3">
                <label className="form-label fw-semibold">Name</label>
                <input
                  className="form-control"
                  value={editingUserData.name || ""}
                  onChange={(e) =>
                    setEditingUserData((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={editingUserData.email || ""}
                  onChange={(e) =>
                    setEditingUserData((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Password</label>
                <input
                  className="form-control"
                  value={editingUserData.password_plain || ""}
                  onChange={(e) =>
                    setEditingUserData((prev) => ({
                      ...prev,
                      password_plain: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="d-flex justify-content-end gap-2 mt-3">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingUserData(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn"
                  style={{ backgroundColor: "#00a693", color: "#fff" }}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ DELETE USER CONFIRM MODAL ============ */}
      {deleteUserData && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 10000,
          }}
        >
          <div
            style={{
              width: "380px",
              background: "white",
              borderRadius: "12px",
              padding: "20px 22px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
              textAlign: "center",
            }}
          >
            <h4 className="fw-bold mb-3" style={{ color: "#d9534f" }}>
              Delete User
            </h4>
            <p>
              Are you sure you want to delete user{" "}
              <strong>{deleteUserData.name}</strong> (
              {deleteUserData.email})?
              <br />
              <span style={{ color: "#b30000" }}>
                This action cannot be undone.
              </span>
            </p>

            <div className="d-flex justify-content-center gap-3 mt-3">
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteUserData(null)}
              >
                Cancel
              </button>
              <button className="btn btn-danger" onClick={confirmDeleteUser}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ USER HISTORY MODAL ============ */}
      {historyUser && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 10000,
          }}
        >
          <div
            style={{
              width: "90vw",
              height: "90vh",
              background: "white",
              borderRadius: "12px",
              display: "flex",
              flexDirection: "row",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* LEFT — SESSION LIST */}
            <div
              style={{
                width: "30%",
                borderRight: "2px solid #00a693",
                padding: "20px",
                overflowY: "auto",
              }}
            >
              <h4 className="fw-bold" style={{ color: "#00a693" }}>
                {historyUser.name}'s Sessions
              </h4>

              {userSessions.length === 0 && (
                <p className="text-muted mt-3">No sessions found.</p>
              )}

              {userSessions.map((s) => (
                <div
                  key={s.sessionId}
                  onClick={() => loadSessionMessages(s.sessionId)}
                  style={{
                    padding: "12px 14px",
                    margin: "10px 0",
                    cursor: "pointer",
                    borderRadius: "6px",
                    background:
                      selectedSession === s.sessionId ? "#e8fff7" : "#f9f9f9",
                    border:
                      selectedSession === s.sessionId
                        ? "2px solid #00a693"
                        : "1px solid #ddd",
                  }}
                >
                  <strong>{s.name}</strong>
                  <br />
                  <small>
                    {s.createdAt
                      ? new Date(s.createdAt).toLocaleString()
                      : ""}
                  </small>
                </div>
              ))}
            </div>

            {/* RIGHT — SESSION MESSAGES */}
            <div
              style={{
                width: "70%",
                padding: "20px",
                overflowY: "auto",
                position: "relative",
              }}
            >
              <h4 className="fw-bold mb-3" style={{ color: "#00a693" }}>
                Session Messages
              </h4>

              {sessionMessages.length === 0 && (
                <p className="text-muted">Select a session to view messages.</p>
              )}

              {sessionMessages.map((msg, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom: "20px",
                    padding: "12px",
                    borderRadius: "8px",
                    background:
                      msg.sender === "User" ? "#e6fff3" : "#e6fff3",
                    border: "1px solid #ccc",
                  }}
                >
                  <strong
                    style={{
                      color:
                        msg.sender === "User" ? "#008f7a" : "#008f7a",
                    }}
                  >
                    {msg.sender || "MESSAGE"}
                  </strong>

                  {/* TEXT */}
                  {msg.text && (
                    <div className="markdown-container" style={{ marginTop: "6px", whiteSpace: "pre-wrap" }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  )}

                  {/* TABLE PREVIEW BUTTON */}
                  {msg.table && (
                    <button
                      onClick={() => setModalImage(msg.table)}
                      className="btn btn-outline-success btn-sm mt-2"
                    >
                      TABLE
                    </button>
                  )}

                  {/* IMAGE PREVIEW BUTTON */}
                  {msg.image && (
                    <button
                      onClick={() => setModalImage(msg.image)}
                      className="btn btn-outline-primary btn-sm mt-2 ms-2"
                    >
                      IMAGE
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* CLOSE HISTORY MODAL BUTTON */}
            <button
              className="btn btn-danger"
              onClick={() => {
                setHistoryUser(null);
                setUserSessions([]);
                setSelectedSession(null);
                setSessionMessages([]);
              }}
              style={{
                position: "absolute",
                top: "15px",
                right: "15px",
                fontWeight: "bold",
              }}
            >
              × Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- IMAGE MODAL ---------------- */
 function ImageModal({ src, onClose }) {
  const { useEffect } = React;
  if (!src) return null;

  const closeOnEsc = (e) => {
    if (e.key === "Escape") onClose();
  };

  useEffect(() => {
    document.addEventListener("keydown", closeOnEsc);
    return () => document.removeEventListener("keydown", closeOnEsc);
  }, []);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 999999,
        cursor: "pointer",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          padding: "10px",
          borderRadius: "12px",
          maxWidth: "100vw",
          maxHeight: "100vh",
        }}
      >
        <img
          src={src}
          alt="preview"
          style={{
            width: "100%",
            maxHeight: "100vh",
            objectFit: "contain",
            borderRadius: "10px",
          }}
        />
      </div>
    </div>
  );
}
