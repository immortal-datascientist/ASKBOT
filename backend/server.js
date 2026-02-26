/**
 * Unified Server
 * - JSON per-user chat storage
 * - Pagination, batch message writing
 * - MySQL admin & user APIs
 * - User Add, Edit, Delete, Status control
 *
 * PORT: 5000
 */


const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const os = require("os");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const { sendOtpMail, sendUserCredentials } = require("./utils/mailService");
const multer = require("multer");
const completedTests = [];
const { extractSectionsFromPdf } = require("./utils/pdfExtractor");

const EVAL_DIR = path.join(__dirname, "evaluations");
const RE_EVAL_DIR = path.join(__dirname, "re_evaluations");

// ⏳ Notifications older than 7 days will be automatically removed
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function sendEvaluationNotification(userName, testId, summary) {
  console.log("📢 Evaluation completed:");
  console.log("User:", userName);
  console.log("Test:", testId);
  console.log("Summary:", summary);
}

const notifications = {};
// ───────────────────────────────────────────────────────────────────────────
// MySQL POOL (server/db.js must export mysql2/promise pool)
// ───────────────────────────────────────────────────────────────────────────
let pool;
try {
  pool = require("./db");
} catch (e) {
  console.warn("⚠ MySQL not configured — ./db.js missing.");
  pool = null;
}

const app = express();
const PORT = process.env.PORT || 5000;

// ───────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ───────────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(bodyParser.json());
app.use(express.json());

// ───────────────────────────────────────────────────────────────────────────
// FOLDERS
// ───────────────────────────────────────────────────────────────────────────
const pdfFolder = path.resolve(__dirname, "../frontend/public/pdfs");
const trainingFolder = path.resolve(
  __dirname,
  "../frontend/public/Training_docs_videos"
);
const TEST_PDF_DIR = path.join(__dirname, "../frontend/public/Test_pdfs");

// ⭐ DAYWISE SELECT DAYS (IMAGES + TOPICS)
app.use(
  "/Finacle_Daywise_select_days",
  express.static(path.join(__dirname, "../frontend/public/Finacle_Daywise_select_days"))
);

app.use(
  "/Fullstack_Daywise_select_days",
  express.static(path.join(__dirname, "../frontend/public/Fullstack_Daywise_select_days"))
);

app.use(
  "/Datascience_Daywise_select_days",
  express.static(path.join(__dirname, "../frontend/public/Datascience_Daywise_select_days"))
);
app.use(
  "/uploads/tests",
  express.static(path.join(__dirname, "uploads/tests"))
);

// ───────────────────────────────────────────────────────────
// ⭐ CREATE TEST PDF FOLDER
// ───────────────────────────────────────────────────────────
const testPdfFolder = path.resolve(
  __dirname,
  "../frontend/public/Test_pdfs"
);

const fullstackFolder = path.resolve(
  __dirname,
  "../frontend/public/Full_Stack_Training_docs_videos"
);
const datascienceFolder = path.resolve(
  __dirname,
  "../frontend/public/Data_Science_Training_docs_videos"
);
const fullStackScheduleFolder = path.join(
  __dirname,
  "../frontend/public/Full_Stack_Schedule"
);
const dataScienceScheduleFolder = path.join(
  __dirname,
  "../frontend/public/Data_Science_Schedule"
);

const chatStorageRoot = path.join(__dirname, "chat_storage");

if (!fs.existsSync(trainingFolder))
  fs.mkdirSync(trainingFolder, { recursive: true });
if (!fs.existsSync(chatStorageRoot))
  fs.mkdirSync(chatStorageRoot, { recursive: true });

// titles 
function getTopicsFile(module) {
  const basePath = path.join(__dirname, "../frontend/public");

  if (module === "finacle")
    return path.join(
      basePath,
      "Finacle_Daywise_select_days",
      "Schedule_Topics",
      "daywise_topics.json"
    );

  if (module === "fullstack")
    return path.join(
      basePath,
      "Fullstack_Daywise_select_days",
      "Schedule_Topics",
      "daywise_topics.json"
    );

  if (module === "datascience")
    return path.join(
      basePath,
      "Datascience_Daywise_select_days",
      "Schedule_Topics",
      "daywise_topics.json"
    );
}

// 🧹 Helper: delete directory ONLY if empty
function removeDirIfEmpty(dirPath) {
  if (!fs.existsSync(dirPath)) return;

  const files = fs.readdirSync(dirPath);
  if (files.length === 0) {
    fs.rmdirSync(dirPath);
  }
}


// ───────────────────────────────────────────────────────────────────────────
// CHAT STORAGE HELPERS
// ───────────────────────────────────────────────────────────────────────────

function safeUsername(username) {
  return String(username || "anonymous").replace(/[^a-zA-Z0-9_.@-]/g, "_");
}

function userFolderPath(username) {
  return path.join(chatStorageRoot, safeUsername(username));
}

function userMetaFile(username) {
  return path.join(userFolderPath(username), "sessions.json");
}

function userSessionFile(username, sessionId) {
  return path.join(userFolderPath(username), `session_${sessionId}.json`);
}

function ensureUserFolder(username) {
  const folder = userFolderPath(username);
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

  const metaFile = userMetaFile(username);
  if (!fs.existsSync(metaFile)) fs.writeFileSync(metaFile, JSON.stringify([], null, 2));
}

function readUserMeta(username) {
  try {
    ensureUserFolder(username);
    return JSON.parse(fs.readFileSync(userMetaFile(username), "utf8"));
  } catch {
    return [];
  }
}

function writeUserMeta(username, meta) {
  try {
    fs.writeFileSync(userMetaFile(username), JSON.stringify(meta, null, 2));
  } catch {}
}

function readSessionJson(username, id) {
  try {
    const file = userSessionFile(username, id);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function writeSessionJson(username, obj) {
  try {
    fs.writeFileSync(userSessionFile(username, obj.sessionId), JSON.stringify(obj, null, 2));
  } catch {}
}

function appendMessageToSession(username, sessionId, msg) {
  const session = readSessionJson(username, sessionId);
  if (!session) return false;

  session.messages = session.messages || [];

  session.messages.push({
    sender: msg.sender,
    text: msg.text,
    table: msg.table || null,
    image: msg.image || null
  });

  writeSessionJson(username, session);
  return true;
}


function batchAppendMessages(username, messages) {
  const grouped = {};

  messages.forEach((m) => {
    if (!grouped[m.sessionId]) grouped[m.sessionId] = [];
    grouped[m.sessionId].push(m);
  });

  Object.keys(grouped).forEach((sessionId) => {
    const session = readSessionJson(username, sessionId);
    if (!session) return;

    session.messages = session.messages || [];
    session.messages.push(...grouped[sessionId].map((m) => ({ sender: m.sender, text: m.text })));

    writeSessionJson(username, session);
  });

  return true;
}

// ───────────────────────────────────────────────────────────────────────────
// STATIC ROUTES
// ───────────────────────────────────────────────────────────────────────────

app.use("/pdfs", express.static(pdfFolder));
app.use("/Training_docs_videos", express.static(trainingFolder));
app.use("/Full_Stack_Training_docs_videos", express.static(fullstackFolder));
app.use("/Data_Science_Training_docs_videos", express.static(datascienceFolder));
app.use("/Full_Stack_Schedule", express.static(fullStackScheduleFolder));
app.use("/Data_Science_Schedule", express.static(dataScienceScheduleFolder));
// ⭐ Serve Create Test PDFs
app.use("/Test_pdfs", express.static(testPdfFolder));

// =======================================================
// ⭐ GET DAYWISE SCHEDULE IMAGE
// =======================================================
app.get("/api/:category/day-image/:day", (req, res) => {
  const { category, day } = req.params;

  const folderMap = {
    finacle: "Finacle_Daywise_select_days",
    fullstack: "Fullstack_Daywise_select_days",
    datascience: "Datascience_Daywise_select_days",
  };

  const baseFolder = folderMap[category];
  if (!baseFolder) {
    return res.json({ ok: true, image: null });
  }

  const dayFolder = `Day${String(day).padStart(2, "0")}`;

  const imageDir = path.join(
    __dirname,
    "../frontend/public",
    baseFolder,
    "Schedule_Images",
    dayFolder
  );

  if (!fs.existsSync(imageDir)) {
    return res.json({ ok: true, image: null });
  }

  const files = fs.readdirSync(imageDir);
  const imageFile = files.find((f) =>
    f.match(/\.(png|jpg|jpeg)$/i)
  );

  if (!imageFile) {
    return res.json({ ok: true, image: null });
  }

  // 🔥 PUBLIC URL (served by express.static)
  res.json({
    ok: true,
    image: `/${baseFolder}/Schedule_Images/${dayFolder}/${imageFile}`,
  });
});

// =======================================================
// ⭐ DELETE DAYWISE SCHEDULE IMAGE
// =======================================================
app.delete("/api/:category/day-image/:day", (req, res) => {
  const { category, day } = req.params;

  const folderMap = {
    finacle: "Finacle_Daywise_select_days",
    fullstack: "Fullstack_Daywise_select_days",
    datascience: "Datascience_Daywise_select_days",
  };

  const baseFolder = folderMap[category];
  if (!baseFolder) return res.json({ ok: true });

  const dayFolder = `Day${String(day).padStart(2, "0")}`;

  const imageDir = path.join(
    __dirname,
    "../frontend/public",
    baseFolder,
    "Schedule_Images",
    dayFolder
  );

  if (!fs.existsSync(imageDir)) {
    return res.json({ ok: true });
  }

  fs.readdirSync(imageDir).forEach((file) => {
    fs.unlinkSync(path.join(imageDir, file));
  });

  res.json({ ok: true });
});

// ───────────────────────────────────────────────────────────────────────────
// PDF LIST API
// ───────────────────────────────────────────────────────────────────────────

app.get("/api/pdfs", (req, res) => {
  try {
    const list = fs
      .readdirSync(pdfFolder)
      .filter((f) => f.toLowerCase().endsWith(".pdf"))
      .map((file) => ({
        title: file.replace(".pdf", "").replace(/[-_]/g, " "),
        url: "/pdfs/" + encodeURIComponent(file),
      }));

    res.json(list);
  } catch {
    res.status(500).json({ error: "Unable to load PDFs" });
  }
});

// ───────────────────────────────────────────────────────────────────────────
// TRAINING FILES
// ───────────────────────────────────────────────────────────────────────────

function scanRecursive(folder) {
  let files = [];
  if (!fs.existsSync(folder)) return files;

  fs.readdirSync(folder, { withFileTypes: true }).forEach((item) => {
    const full = path.join(folder, item.name);
    if (item.isDirectory()) files.push(...scanRecursive(full));
    else files.push(full);
  });

  return files;
}

app.get("/api/dayfiles/:day", (req, res) => {
  const day = String(req.params.day).padStart(2, "0");
  const dir = path.join(trainingFolder, `Day${day}`);

  if (!fs.existsSync(dir)) {
    return res.json({
      pdfs: [],
      videos: { english: [], tamil: [], telugu: [], kannada: [] },
    });
  }

  const all = scanRecursive(dir);
  const pdfs = [];
  const videos = { english: [], tamil: [], telugu: [], kannada: [] };

  all.forEach((file) => {
    const url = "/Training_docs_videos" + file.split("Training_docs_videos")[1].replace(/\\/g, "/");
    const title = path.basename(file).replace(/\.[^/.]+$/, "");

    if (file.toLowerCase().endsWith(".pdf")) {
      pdfs.push({ title, url });
    } else if (/\.(mp4|mov|avi|mkv|webm)$/i.test(file)) {
      const f = file.toLowerCase();
      if (f.includes("tamil")) videos.tamil.push({ title, url });
      else if (f.includes("telugu")) videos.telugu.push({ title, url });
      else if (f.includes("kannada")) videos.kannada.push({ title, url });
      else videos.english.push({ title, url });
    }
  });

  res.json({ pdfs, videos });
});

// ───────────────────────────────────────────────────────────────────────────
// DAYS LIST
// ───────────────────────────────────────────────────────────────────────────

app.get("/api/allDays", (req, res) => {
  try {
    const days = fs
      .readdirSync(trainingFolder, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    res.json(days);
  } catch {
    res.status(500).json([]);
  }
});

// ───────────────────────────────────────────────────────────────────────────
// CHAT SESSION API
// ───────────────────────────────────────────────────────────────────────────

app.get("/api/sessions/:username", (req, res) => {
  res.json(readUserMeta(req.params.username));
});

app.post("/api/session/create", (req, res) => {
  const { username, name } = req.body;

  ensureUserFolder(username);

  const meta = readUserMeta(username);
  const maxId = meta.length ? Math.max(...meta.map((m) => +m.sessionId)) : 0;

  const sessionId = maxId + 1;
  const session = {
    sessionId,
    name: name?.trim() || `Session ${sessionId}`,
    createdAt: new Date().toISOString(),
    messages: [],
  };

  writeSessionJson(username, session);
  meta.push({ sessionId, name: session.name, createdAt: session.createdAt });
  writeUserMeta(username, meta);

  res.json(session);
});

app.post("/api/session/addMessage", (req, res) => {
 const { username, sessionId, sender, text, table, image } = req.body;

appendMessageToSession(username, sessionId, {
  sender,
  text,
  table,
  image
});

  res.json({ success: true });
});

app.post("/api/session/batchAddMessage", (req, res) => {
  batchAppendMessages(req.body.username, req.body.messages || []);
  res.json({ success: true });
});

app.get("/api/session/:username/:id", (req, res) => {
  const { username, id } = req.params;

  const s = readSessionJson(username, id);
  if (!s) return res.status(404).json({ error: "Session not found" });

  const offset = +req.query.offset || 0;
  const limit = Math.min(+req.query.limit || 20, 200);

  res.json({
    sessionId: s.sessionId,
    name: s.name,
    total: s.messages.length,
    messages: s.messages.slice(offset, offset + limit),
  });
});

app.post("/api/session/rename", (req, res) => {
  const { username, sessionId, newName } = req.body;

  const meta = readUserMeta(username);
  const index = meta.findIndex((m) => String(m.sessionId) === String(sessionId));

  if (index === -1) return res.status(404).json({ error: "Session not found" });

  meta[index].name = newName.trim();
  writeUserMeta(username, meta);

  const sess = readSessionJson(username, sessionId);
  if (sess) {
    sess.name = newName.trim();
    writeSessionJson(username, sess);
  }

  res.json({ success: true });
});

app.delete("/api/session/:username/:id", (req, res) => {
  const { username, id } = req.params;

  const file = userSessionFile(username, id);
  if (fs.existsSync(file)) fs.unlinkSync(file);

  const meta = readUserMeta(username).filter((s) => String(s.sessionId) !== String(id));
  writeUserMeta(username, meta);

  res.json({ success: true });
});

// ───────────────────────────────────────────────────────────────────────────
// MYSQL USER SYSTEM
// ───────────────────────────────────────────────────────────────────────────

async function mysqlCheck() {
  if (!pool) throw new Error("MySQL not connected.");
}

/** LOGIN ROUTE */
app.post("/api/login", async (req, res) => {
  try {
    await mysqlCheck();
    const { email, password } = req.body;

    /* ----------------------------------------------------
     * 1️⃣ CHECK ADMIN TABLE FIRST
     * ---------------------------------------------------- */
    const [adminRows] = await pool.query("SELECT * FROM admin WHERE email = ?", [email]);

    if (adminRows.length > 0) {
      const admin = adminRows[0];
      const ok = await bcrypt.compare(password, admin.password_hash);
      if (!ok) return res.status(401).json({ error: "Invalid credentials" });

      return res.json({
        ok: true,
        role: "admin",
        email: admin.email,
        name: admin.name || "Admin",
      });
    }

    /* ----------------------------------------------------
     * 2️⃣ CHECK EMPLOYEE (users table)
     * ---------------------------------------------------- */
    const [userRows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);

    if (!userRows.length) return res.status(401).json({ error: "Invalid credentials" });

    const user = userRows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    // Update status as ACTIVE
    await pool.query("UPDATE users SET status='active' WHERE id=?", [user.id]);

    // Auto-create chat folder & default session
    const username = user.email;
    ensureUserFolder(username);
    let meta = readUserMeta(username);

    if (!meta.length) {
      const session = {
        sessionId: 1,
        name: "Session 1",
        createdAt: new Date().toISOString(),
        messages: [],
      };
      writeSessionJson(username, session);
      writeUserMeta(username, [{ sessionId: 1, name: "Session 1", createdAt: session.createdAt }]);
    }

    return res.json({
      ok: true,
      role: "employee",
      id: user.id,
      email: user.email,
      name: user.name,
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/** LOGOUT ROUTE */
app.post("/api/user/logout", async (req, res) => {
  try {
    await mysqlCheck();

    const { id } = req.body;

    if (!id) return res.status(400).json({ error: "User ID required" });

    const [result] = await pool.query(
      "UPDATE users SET status = 'inactive' WHERE id = ?",
      [id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Logout failed" });
  }
});




/** UPDATE ADMIN */
app.put("/api/admin", async (req, res) => {
  try {
    await mysqlCheck();
    const { currentEmail, currentPassword, newEmail, newPassword } = req.body;

    const [rows] = await pool.query("SELECT * FROM admin WHERE email = ?", [currentEmail]);
    if (!rows.length) return res.status(401).json({ error: "Invalid current credentials" });

    const admin = rows[0];
    const ok = await bcrypt.compare(currentPassword, admin.password_hash);

    if (!ok) return res.status(401).json({ error: "Invalid current credentials" });

    const updates = [];
    const values = [];

    if (newEmail) {
      updates.push("email = ?");
      values.push(newEmail);
    }
    if (newPassword) {
      updates.push("password_hash = ?");
      values.push(await bcrypt.hash(newPassword, 10));
    }

    if (!updates.length) return res.status(400).json({ error: "Nothing to update" });

    values.push(admin.id);

    await pool.query(`UPDATE admin SET ${updates.join(", ")} WHERE id = ?`, values);

    res.json({ ok: true });
  } catch (err) {
    console.error("UPDATE ADMIN ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/** ADD USER (admin or employee) */
app.post("/api/users", async (req, res) => {
  try {
    await mysqlCheck();
   const { role, id, name, email, password, domain } = req.body;

    if (!role || !name || !email || !password)
      return res.status(400).json({ error: "Missing required fields" });

    const hash = await bcrypt.hash(password, 10);

    if (role === "admin") {
      await pool.query(
        `INSERT INTO admin (name, email, password_hash)
         VALUES (?, ?, ?)`,
        [name, email, hash]
      );

      // ✅ Send credentials email
     await sendUserCredentials(email, name, password);


      return res.json({ ok: true, msg: "Admin added & credentials emailed" });
    }

    if (!id)
      return res.status(400).json({ error: "Employee ID is required" });

   await pool.query(
  `INSERT INTO users 
   (id, name, email, password_hash, password_plain, domain, status, created_at)
   VALUES (?, ?, ?, ?, ?, ?, 'inactive', NOW())`,
  [id, name, email, hash, password, domain]
);


    // ✅ Send credentials email
   await sendUserCredentials(email, name, password);

    return res.json({ ok: true, msg: "Employee added & credentials emailed" });

  } catch (err) {
    console.log("Add user error:", err);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ error: "Email or ID already exists" });
    }

    res.status(500).json({ error: "Server error" });
  }
});


app.post("/api/send-otp", async (req, res) => {
  try {
    await mysqlCheck();
    const { email } = req.body;

    const [rows] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (!rows.length)
      return res.status(400).json({ error: "Email not found" });

    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStore[email] = otp;

    // ⭐ SEND REAL EMAIL
    await sendOtpMail(email, otp);

    return res.json({ ok: true });
  } catch (err) {
    console.error("SEND OTP ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});


/** GET ALL USERS */
app.get("/api/users", async (req, res) => {
  try {
    await mysqlCheck();

   const [rows] = await pool.query(
  `SELECT id, name, email, password_plain, domain, status, created_at
   FROM users
   ORDER BY created_at DESC`
);


    res.json({ ok: true, users: rows });
  } catch (err) {
    console.error("GET USERS ERROR:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

/** UPDATE USER (employee row) */
app.put("/api/users/:id", async (req, res) => {
  try {
    await mysqlCheck();
    const { name, email, password } = req.body;

    const hash = password ? await bcrypt.hash(password, 10) : null;

    await pool.query(
      `UPDATE users 
       SET name = ?, email = ?, password_plain = ?, password_hash = ?
       WHERE id = ?`,
      [name, email, password, hash, req.params.id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("UPDATE USER ERROR:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

/* ------------------------------------------------------------
 * ⭐ DELETE USER
 * ------------------------------------------------------------ */
app.delete("/api/users/:id", async (req, res) => {
  try {
    await mysqlCheck();
    await pool.query("DELETE FROM users WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE USER ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});



/* ⭐ API: Get current receiving status */
app.get("/api/tempChat/status", (req, res) => {
  try {
    const s = JSON.parse(fs.readFileSync(settingsFile, "utf8"));
    return res.json({ ok: true, enabled: s.receiveEnabled });
  } catch (err) {
    return res.json({ ok: false, enabled: true });
  }
});

/* =========================================================================
   ⭐ ADMIN — GET USER CHAT HISTORY (LIST OF SESSIONS)
   ========================================================================= */
app.get("/api/admin/userHistory/:email", (req, res) => {
  const email = req.params.email;
  try {
    const meta = readUserMeta(email);
    return res.json({ ok: true, sessions: meta });
  } catch (err) {
    console.error("History list error:", err);
    return res.json({ ok: false, sessions: [] });
  }
});

/* =========================================================================
   ⭐ ADMIN — GET ALL MESSAGES IN ONE SESSION
   ========================================================================= */
app.get("/api/admin/userHistory/:email/:sessionId", (req, res) => {
  const email = req.params.email;
  const sessionId = req.params.sessionId;

  try {
    const session = readSessionJson(email, sessionId);
    if (!session) {
      return res.json({ ok: false, messages: [] });
    }
    return res.json({ ok: true, messages: session.messages || [] });
  } catch (err) {
    console.error("Session message error:", err);
    return res.json({ ok: false, messages: [] });
  }
});


// TEMP CHAT STORAGE FOLDER
const tempChatFolder = path.join(__dirname, "temp_chat_storage");
if (!fs.existsSync(tempChatFolder)) {
  fs.mkdirSync(tempChatFolder, { recursive: true });
}

function tempChatFile() {
  return path.join(tempChatFolder, "temp_pairs.json");
}

// ensure temp file
if (!fs.existsSync(tempChatFile())) {
  fs.writeFileSync(tempChatFile(), JSON.stringify([], null, 2));
}

/* ⭐ SETTINGS FILE to control Start/Stop receiving */
const settingsFile = path.join(tempChatFolder, "settings.json");
if (!fs.existsSync(settingsFile)) {
  fs.writeFileSync(settingsFile, JSON.stringify({ receiveEnabled: true }, null, 2));
}

/* ⭐ API: Toggle receiving */
app.post("/api/tempChat/toggle", (req, res) => {
  const { enabled } = req.body;

  fs.writeFileSync(
    settingsFile,
    JSON.stringify({ receiveEnabled: enabled }, null, 2)
  );

  return res.json({ ok: true, status: enabled ? "enabled" : "disabled" });
});

/* ⭐ API: Get current receiving status */
app.get("/api/tempChat/status", (req, res) => {
  try {
    const s = JSON.parse(fs.readFileSync(settingsFile, "utf8"));
    return res.json({ ok: true, enabled: s.receiveEnabled });
  } catch (err) {
    return res.json({ ok: false, enabled: true });
  }
});


/* ⭐ Helper: Read toggle */
function isReceivingEnabled() {
  const s = JSON.parse(fs.readFileSync(settingsFile, "utf8"));
  return s.receiveEnabled;
}

/* ⭐ Save Pair API with TOGGLE CHECK */
// ⭐ FIXED: SINGLE SAVE PAIR ROUTE WITH TOGGLE CHECK
app.post("/api/tempChat/savePair", (req, res) => {
  const { userText, aiText } = req.body;

  if (!userText || !aiText) {
    return res.json({ ok: false, error: "Missing data" });
  }

  // ⭐ Check toggle before saving
  const settings = JSON.parse(fs.readFileSync(settingsFile, "utf8"));
  if (!settings.receiveEnabled) {
    return res.json({ ok: false, error: "Receiving disabled" });
  }

  const tempFile = tempChatFile();
  let data = [];

  if (fs.existsSync(tempFile)) {
    data = JSON.parse(fs.readFileSync(tempFile, "utf8"));
  }

  const safeAI = {
    text: aiText.text || "",
    table: aiText.table || aiText.tableUrl || null,
    image: aiText.image || aiText.imageUrl || null,
  };

  data.push({
    id: Date.now(),
    user: userText,
    ai: safeAI,
  });

  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));

  res.json({ ok: true });
});

/* ⭐ Get all temp chats */
app.get("/api/tempChat/all", (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(tempChatFile(), "utf8"));
    res.json({ ok: true, messages: data });
  } catch (err) {
    res.json({ ok: false, error: "Error reading temporary chats" });
  }
});

/* ⭐ Delete one temp chat */
app.delete("/api/tempChat/delete/:id", (req, res) => {
  const id = req.params.id;
  const file = tempChatFile();
  let data = JSON.parse(fs.readFileSync(file, "utf8"));

  data = data.filter((p) => String(p.id) !== String(id));

  fs.writeFileSync(file, JSON.stringify(data, null, 2));

  res.json({ ok: true });
});

/* ⭐ Approve chat → move to global */
const globalFolder = path.join(__dirname, "global_chat_storage");
const globalFile = path.join(globalFolder, "global_pairs.json");

if (!fs.existsSync(globalFolder)) fs.mkdirSync(globalFolder);
if (!fs.existsSync(globalFile)) fs.writeFileSync(globalFile, JSON.stringify([], null, 2));

app.post("/api/tempChat/approve/:id", (req, res) => {
  const id = req.params.id;

  const temp = JSON.parse(fs.readFileSync(tempChatFile(), "utf8"));
  const item = temp.find((p) => String(p.id) === String(id));
  if (!item) return res.json({ ok: false, error: "Not found" });

  const global = JSON.parse(fs.readFileSync(globalFile, "utf8"));
  global.push(item);
  fs.writeFileSync(globalFile, JSON.stringify(global, null, 2));

  const updated = temp.filter((p) => String(p.id) !== String(id));
  fs.writeFileSync(tempChatFile(), JSON.stringify(updated, null, 2));

  res.json({ ok: true });
});

/* =========================================================================
   ⭐ GLOBAL AUTO-SUGGEST SEARCH
   ========================================================================= */
app.get("/api/globalSearch", (req, res) => {
  try {
    const q = (req.query.q || "").toLowerCase();

    const globalFile = path.join(__dirname, "global_chat_storage/global_pairs.json");
    const data = JSON.parse(fs.readFileSync(globalFile, "utf8"));

    const results = data.filter(entry =>
      entry.user.toLowerCase().includes(q)
    );

    res.json({ ok: true, results });
  } catch (err) {
    console.error("Global search error:", err);
    res.json({ ok: false, results: [] });
  }
});

app.get("/api/fullstack/dayfiles/:day", (req, res) => {
  const day = String(req.params.day).padStart(2, "0");
  const dir = path.join(fullstackFolder, `Day${day}`);

  if (!fs.existsSync(dir)) {
    return res.json({
      pdfs: [],
      videos: { english: [], tamil: [], telugu: [], kannada: [] }
    });
  }

  const files = fs.readdirSync(dir);
  const pdfs = [];
  const videoList = [];

  files.forEach((file) => {
    const url = `/Full_Stack_Training_docs_videos/Day${day}/${file}`;
    const title = file.replace(/\.[^/.]+$/, "");

    if (file.toLowerCase().endsWith(".pdf")) {
      pdfs.push({ title, url });
    }

    if (/\.(mp4|mov|avi|mkv|webm)$/i.test(file)) {
      videoList.push({ title, url });
    }
  });

  // FINAL FORMAT matching frontend
  res.json({
    pdfs,
    videos: {
      english: videoList,
      tamil: [],
      telugu: [],
      kannada: []
    }
  });
});



app.get("/api/datascience/dayfiles/:day", (req, res) => {
  const day = String(req.params.day).padStart(2, "0");
  const dir = path.join(datascienceFolder, `Day${day}`);

  if (!fs.existsSync(dir)) {
    return res.json({
      pdfs: [],
      videos: { english: [], tamil: [], telugu: [], kannada: [] }
    });
  }

  const files = fs.readdirSync(dir);
  const pdfs = [];
  const videoList = [];

  files.forEach((file) => {
    const url = `/Data_Science_Training_docs_videos/Day${day}/${file}`;
    const title = file.replace(/\.[^/.]+$/, "");

    if (file.toLowerCase().endsWith(".pdf")) {
      pdfs.push({ title, url });
    }

    if (/\.(mp4|mov|avi|mkv|webm)$/i.test(file)) {
      videoList.push({ title, url });
    }
  });

  // FINAL FORMAT matching frontend
  res.json({
    pdfs,
    videos: {
      english: videoList,
      tamil: [],
      telugu: [],
      kannada: []
    }
  });
});

// API to get list of schedule PDFs
app.get("/api/fullstack/schedule", (req, res) => {
  try {
    if (!fs.existsSync(fullStackScheduleFolder)) {
      return res.json([]);
    }

    const files = fs.readdirSync(fullStackScheduleFolder);
    const pdfs = files
      .filter(f => f.toLowerCase().endsWith(".pdf"))
      .map(file => ({
        title: file.replace(".pdf", "").replace(/[-_]/g, " "),
        url: `/Full_Stack_Schedule/${file}`
      }));

    res.json(pdfs);
  } catch (err) {
    console.error("Schedule Error:", err);
    res.json([]);
  }
});
// API to get list of schedule PDFs
app.get("/api/datascience/schedule", (req, res) => {
  try {
    if (!fs.existsSync(dataScienceScheduleFolder)) {
      return res.json([]);
    }

    const files = fs.readdirSync(dataScienceScheduleFolder);
    const pdfs = files
      .filter(f => f.toLowerCase().endsWith(".pdf"))
      .map(file => ({
        title: file.replace(".pdf", "").replace(/[-_]/g, " "),
        url: `/Data_Science_Schedule/${file}`
      }));

    res.json(pdfs);
  } catch (err) {
    console.error("Data Science Schedule Error:", err);
    res.json([]);
  }
});


const otpStore = {}; // temp in-memory OTP store

app.post("/api/send-otp", async (req, res) => {
  try {
    await mysqlCheck();
    const { email } = req.body;

    const [rows] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (!rows.length)
      return res.status(400).json({ error: "Email not found" });

    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStore[email] = otp;

    // TODO: send email here
    console.log("OTP for", email, "=", otp);

    return res.json({ ok: true });
  } catch (err) {
    console.error("SEND OTP ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/reset-password", async (req, res) => {
  try {
    await mysqlCheck();
    const { email, otp, password } = req.body;

    if (!otpStore[email])
      return res.status(400).json({ error: "OTP expired or invalid." });

    if (parseInt(otp) !== otpStore[email])
      return res.status(400).json({ error: "Incorrect OTP." });

    const hash = await bcrypt.hash(password, 10);

    await pool.query(
      "UPDATE users SET password_plain=?, password_hash=? WHERE email=?",
      [password, hash, email]
    );

    delete otpStore[email];

    return res.json({ ok: true });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─────────────────────────────────────────────
// ⭐ ADMIN UPLOAD TRAINING CONTENT
// ─────────────────────────────────────────────

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { category, day } = req.body;

    if (!category || !day) {
      return cb(new Error("Category and Day required"));
    }

    const dayFolder = `Day${String(day).padStart(2, "0")}`;
    let baseDir = "";

    // =================================================
    // 🖼 IMAGE → Daywise Schedule Images (ALL MODULES)
    // =================================================
    if (file.mimetype.startsWith("image")) {
      const imageBaseMap = {
        finacle: "Finacle_Daywise_select_days",
        fullstack: "Fullstack_Daywise_select_days",
        datascience: "Datascience_Daywise_select_days",
      };

      baseDir = path.join(
        __dirname,
        "../frontend/public",
        imageBaseMap[category],
        "Schedule_Images",
        dayFolder
      );
    }

    // =================================================
    // 🎥 VIDEO + 📄 PDF
    // =================================================
    else {
      // ---------- FINACLE (language-wise videos) ----------
      if (category === "finacle") {
        baseDir = path.join(
          __dirname,
          "../frontend/public/Training_docs_videos",
          dayFolder
        );

        if (file.mimetype.startsWith("video")) {
          let lang = "english";
          if (file.fieldname === "video_tamil") lang = "tamil";
          if (file.fieldname === "video_telugu") lang = "telugu";
          if (file.fieldname === "video_kannada") lang = "kannada";

          baseDir = path.join(baseDir, lang);
        }
      }

      // ---------- FULLSTACK (single video) ----------
      if (category === "fullstack") {
        baseDir = path.join(
          __dirname,
          "../frontend/public/Full_Stack_Training_docs_videos",
          dayFolder
        );
      }

      // ---------- DATASCIENCE (single video) ----------
      if (category === "datascience") {
        baseDir = path.join(
          __dirname,
          "../frontend/public/Data_Science_Training_docs_videos",
          dayFolder
        );
      }
    }

    fs.mkdirSync(baseDir, { recursive: true });
    cb(null, baseDir);
  },

  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});



const upload = multer({ storage });

// ⭐ API
app.post(
  "/api/admin/upload-training",
  upload.fields([
  { name: "pdf", maxCount: 1 },
  { name: "video_english", maxCount: 1 },
  { name: "video_tamil", maxCount: 1 },
  { name: "video_telugu", maxCount: 1 },
  { name: "video_kannada", maxCount: 1 },
  { name: "image", maxCount: 1 },
]),
  (req, res) => {
    try {
      return res.json({ ok: true, message: "Upload successful" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  }
);

app.get("/api/finacle/max-day", (req, res) => {
  try {
    const baseDir = path.join(
      __dirname,
      "../frontend/public/Training_docs_videos"
    );

    let maxFolderDay = 0;

    if (fs.existsSync(baseDir)) {
      const days = fs
        .readdirSync(baseDir, { withFileTypes: true })
        .filter(d => d.isDirectory() && d.name.startsWith("Day"))
        .map(d => parseInt(d.name.replace("Day", ""), 10))
        .filter(n => !isNaN(n));

      if (days.length) maxFolderDay = Math.max(...days);
    }

    const PLANNED_DAYS = 60; // ⭐ Finacle duration

    res.json({
      maxDay: Math.max(maxFolderDay, PLANNED_DAYS)
    });

  } catch (err) {
    console.error(err);
    res.json({ maxDay: 60 });
  }
});


app.get("/api/fullstack/max-day", (req, res) => {
  try {
    const baseDir = path.join(
      __dirname,
      "../frontend/public/Full_Stack_Training_docs_videos"
    );

    let maxFolderDay = 0;

    if (fs.existsSync(baseDir)) {
      const days = fs
        .readdirSync(baseDir, { withFileTypes: true })
        .filter(d => d.isDirectory() && d.name.startsWith("Day"))
        .map(d => parseInt(d.name.replace("Day", ""), 10))
        .filter(n => !isNaN(n));

      if (days.length) maxFolderDay = Math.max(...days);
    }

    const PLANNED_DAYS = 60; // ⭐ your curriculum length

    res.json({
      maxDay: Math.max(maxFolderDay, PLANNED_DAYS)
    });

  } catch (err) {
    console.error(err);
    res.json({ maxDay: 50 });
  }
});



app.get("/api/datascience/max-day", (req, res) => {
  try {
    const baseDir = path.join(
      __dirname,
      "../frontend/public/Data_Science_Training_docs_videos"
    );

    let maxFolderDay = 0;

    if (fs.existsSync(baseDir)) {
      const days = fs
        .readdirSync(baseDir, { withFileTypes: true })
        .filter(d => d.isDirectory() && d.name.startsWith("Day"))
        .map(d => parseInt(d.name.replace("Day", ""), 10))
        .filter(n => !isNaN(n));

      if (days.length) maxFolderDay = Math.max(...days);
    }

    const PLANNED_DAYS = 60; // ⭐ Data Science duration

    res.json({
      maxDay: Math.max(maxFolderDay, PLANNED_DAYS)
    });

  } catch (err) {
    console.error(err);
    res.json({ maxDay: 60 });
  }
});


app.get("/api/:module/daywise-topics", (req, res) => {
  try {
    const filePath = getTopicsFile(req.params.module);

    // Ensure folder exists
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    // Ensure file exists with valid JSON
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
    }

    let raw = fs.readFileSync(filePath, "utf8").trim();

    // 🔥 THIS FIXES "Unexpected end of JSON input"
    if (!raw) {
      raw = "{}";
      fs.writeFileSync(filePath, raw);
    }

    const data = JSON.parse(raw);
    res.json({ ok: true, data });
  } catch (err) {
    console.error("Daywise topics GET error:", err);
    res.json({ ok: true, data: {} });
  }
});



app.post("/api/:module/daywise-topics", (req, res) => {
  try {
    const { day, title } = req.body;
    const filePath = getTopicsFile(req.params.module);

    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    let data = {};

    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf8").trim();
      data = raw ? JSON.parse(raw) : {};
    }

    data[day] = { title };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    res.json({ ok: true });
  } catch (err) {
    console.error("Daywise topics POST error:", err);
    res.status(500).json({ ok: false });
  }
});



app.get("/api/:module/day-image/:day", (req, res) => {
  const { module, day } = req.params;

  const basePathMap = {
    finacle: "Finacle_Daywise_select_days",
    fullstack: "Fullstack_Daywise_select_days",
    datascience: "Datascience_Daywise_select_days",
  };

  const folder = path.join(
    __dirname,
    "../frontend/public",
    basePathMap[module],
    "Schedule_Images",
    `Day${String(day).padStart(2, "0")}`
  );

  if (!fs.existsSync(folder)) {
    return res.json({ ok: false });
  }

  const image = fs
    .readdirSync(folder)
    .find(f => /\.(png|jpg|jpeg|webp)$/i.test(f));

  if (!image) {
    return res.json({ ok: false });
  }

  res.json({
    ok: true,
    url: `/${basePathMap[module]}/Schedule_Images/Day${String(day).padStart(2, "0")}/${image}`
  });
});


// ───────────────────────────────────────────────────────────
// ⭐ CREATE TEST – LIST TEST PDFs
// ───────────────────────────────────────────────────────────
// ⭐ CREATE TEST – LIST TEST PDFs (FIXED)
app.get("/api/test-documents", (req, res) => {
  try {
    if (!fs.existsSync(testPdfFolder)) {
      return res.json({ ok: true, documents: [] });
    }

    const pdfFiles = fs
      .readdirSync(testPdfFolder)
      .filter(file => file.toLowerCase().endsWith(".pdf"))
      .map(file => ({
        name: file,
        title: file.replace(".pdf", "").replace(/[-_]/g, " "),
        url: `/Test_pdfs/${encodeURIComponent(file)}`
      }));

    return res.json({
      ok: true,
      documents: pdfFiles
    });

  } catch (err) {
    console.error("Test documents error:", err);
    return res.status(500).json({
      ok: false,
      documents: []
    });
  }
});
// ───────────────────────────────────────────
// 📝 ASSIGN TEST + CREATE NOTIFICATION
// ───────────────────────────────────────────
app.post("/api/assign-test", (req, res) => {
  const { testId, doc, users } = req.body;

  users.forEach((userId) => {
    if (!notifications[userId]) notifications[userId] = [];

    notifications[userId].push({
      id: Date.now() + Math.floor(Math.random() * 10000), // ✅ FIX
      title: "New Test Assigned",
      message: "You have been assigned a new assessment.",
      testId,
      pdf: doc,
      isRead: false,
      isCompleted: false,
      createdAt: new Date(),
    });
  });

  res.json({ ok: true });
});

// ⭐ DELETE TEST PDF
app.delete("/api/admin/delete-test-pdf/:filename", (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.filename);

    const filePath = path.join(
      __dirname,
      "../frontend/public/Test_pdfs",
      filename
    );

    if (!fs.existsSync(filePath)) {
      return res.json({ ok: false, message: "File not found" });
    }

    fs.unlinkSync(filePath);

    return res.json({ ok: true });
  } catch (err) {
    console.error("❌ Delete test PDF failed:", err);
    return res.status(500).json({ ok: false });
  }
});





// ───────────────────────────────────────────
// 🔔 NOTIFICATIONS API (NO DB)
// ───────────────────────────────────────────

// 🔴 Unread count
app.get("/api/notifications/unread-count/:userId", (req, res) => {
  const { userId } = req.params;
  const list = notifications[userId] || [];
  const unread = list.filter(n => !n.isRead).length;
  res.json({ ok: true, count: unread });
});

// 📩 Get all notifications
app.get("/api/notifications/:userId", (req, res) => {
  res.json({
    ok: true,
    notifications: notifications[req.params.userId] || []
  });
});

// ✅ Mark notification as read
app.post("/api/notifications/mark-read", (req, res) => {
  const { userId, notificationId } = req.body;

  const list = notifications[userId] || [];
  const notif = list.find(n => n.id === notificationId);

  if (notif) notif.isRead = true;

  res.json({ ok: true });
});


app.post("/api/test/submit", (req, res) => {
  const { testId, userId } = req.body;

  // 1️⃣ Mark notification as completed
  const list = notifications[userId] || [];
  list.forEach((n) => {
    if (n.testId === testId) {
      n.isCompleted = true;
    }
  });

  // 2️⃣ Store completion for admin
  if (!completedTests.find(
    (t) => t.testId === testId && t.userId === userId
  )) {
    completedTests.push({
      testId,
      userId,
      status: "completed",
      completedAt: new Date()
    });
  }

  res.json({ ok: true });
});


/**
 * 🧹 Cleans notifications older than 1 week for a given user
 * @param {string} userId - Logged-in user ID
 */
function cleanOldNotifications(userId) {
  // If user has no notifications, nothing to clean
  if (!notifications[userId]) return;

  const now = Date.now();

  // Keep only notifications created within the last 7 days
  notifications[userId] = notifications[userId].filter((n) => {
    return now - new Date(n.createdAt).getTime() <= ONE_WEEK_MS;
  });
}


/**
 * 📩 Get all notifications for a user
 * - Automatically deletes notifications older than 1 week
 */
app.get("/api/notifications/:userId", (req, res) => {
  const { userId } = req.params;

  // 🧹 Remove old notifications before sending response
  cleanOldNotifications(userId);

  res.json({
    ok: true,
    notifications: notifications[userId] || [],
  });
});

/**
 * 🔔 Get unread notification count for a user
 * - Cleans old notifications first
 * - Returns accurate unread count
 */
app.get("/api/notifications/unread-count/:userId", (req, res) => {
  const { userId } = req.params;

  // 🧹 Clean expired notifications
  cleanOldNotifications(userId);

  const list = notifications[userId] || [];

  // Count only unread notifications
  const count = list.filter((n) => !n.isRead).length;

  res.json({ ok: true, count });
});


app.get("/api/test/status/:testId", (req, res) => {
  const { testId } = req.params;

  const statuses = {};

  completedTests
    .filter((t) => t.testId === testId)
    .forEach((t) => {
      statuses[t.userId] = "completed";
    });

  res.json({
    ok: true,
    statuses
  });
});


// ───────────────────────────────────────────
// ⭐ UPLOAD CREATE TEST PDF
// ───────────────────────────────────────────

const testPdfStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(testPdfFolder, { recursive: true });
    cb(null, testPdfFolder);
  },
  filename: (req, file, cb) => {
  cb(null, file.originalname);
}
,
});

const uploadTestPdf = multer({
  storage: testPdfStorage,
  fileFilter: (req, file, cb) => {
    const isPdf =
      file.mimetype === "application/pdf" ||
      file.mimetype === "application/octet-stream" ||
      file.originalname.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files allowed"));
    }
  },
});


app.post(
  "/api/admin/upload-test-pdf",
  uploadTestPdf.single("pdf"),
  (req, res) => {
    res.json({
      ok: true,
      filename: req.file.filename,
    });
  }
);

app.post("/api/test/reset", (req, res) => {
  const { testId, userId } = req.body;

  if (!testId || !userId) {
    return res.status(400).json({ ok: false });
  }

  // Example: completedTests array
  const index = completedTests.findIndex(
    (t) => t.testId === testId && t.userId === userId
  );

  if (index !== -1) {
    completedTests.splice(index, 1);
  }

  return res.json({ ok: true });
});

// 🔹 GET QUESTIONS FROM PDF
app.get("/api/test/questions/:pdf", async (req, res) => {
  try {
    const decodedPdf = decodeURIComponent(req.params.pdf);
    const filePath = path.join(
      __dirname,
      "../frontend/public/Test_pdfs",
      decodedPdf
    );

    console.log("📄 Reading PDF:", filePath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        ok: false,
        message: "PDF not found"
      });
    }

    const sections = await extractSectionsFromPdf(filePath);

    res.json({
      ok: true,
      sections
    });
  } catch (err) {
    console.error("🔥 PDF extraction failed:", err.message);
    res.status(500).json({
      ok: false,
      message: err.message
    });
  }
});

// 🔹 ADMIN – LIST ALL EVALUATION REPORTS
app.get("/api/evaluation/reports", (req, res) => {
  const reportsMap = new Map();

  const sources = [
    { dir: EVAL_DIR, isReEvaluation: false },
    { dir: RE_EVAL_DIR, isReEvaluation: true }
  ];

  sources.forEach(({ dir, isReEvaluation }) => {
    if (!fs.existsSync(dir)) return;

    fs.readdirSync(dir).forEach(testName => {
      const testPath = path.join(dir, testName);
      if (!fs.statSync(testPath).isDirectory()) return;

      fs.readdirSync(testPath).forEach(userName => {
        const userPath = path.join(testPath, userName);
        if (!fs.statSync(userPath).isDirectory()) return;

        fs.readdirSync(userPath)
          .filter(d => d.startsWith("attempt-"))
          .forEach(attempt => {
            const key = `${testName}|${userName}|${attempt}`;

            // 🔑 re_evaluation ALWAYS wins
            if (
              !reportsMap.has(key) ||
              isReEvaluation
            ) {
              reportsMap.set(key, {
                testName,
                userName,
                attempt,
                isReEvaluation,
                status: isReEvaluation
                  ? "IN_PROGRESS"
                  : "COMPLETED"
              });
            }
          });
      });
    });
  });

  res.json({
    ok: true,
    reports: Array.from(reportsMap.values())
  });
});






// 🔹 ADMIN – LIST TESTS
app.get("/api/evaluation/tests", (req, res) => {
  if (!fs.existsSync(EVAL_DIR)) {
    return res.json({ ok: true, tests: [] });
  }

  res.json({
    ok: true,
    tests: fs.readdirSync(EVAL_DIR)
  });
});



// 🔹 ADMIN – LIST USERS
app.get("/api/evaluation/users/:testId", (req, res) => {
  const dir = path.join(EVAL_DIR, req.params.testId);
  if (!fs.existsSync(dir)) {
    return res.json({ ok: true, users: [] });
  }

  const users = fs
  .readdirSync(dir)
  .filter(name =>
    fs.statSync(path.join(dir, name)).isDirectory()
  );

res.json({ ok: true, users });

});



// 🔹 ADMIN – GET ANSWERS
app.get("/api/evaluation/answers/:testId/:user", (req, res) => {
  const file = path.join(
    EVAL_DIR,
    req.params.testId,
    `${req.params.user}.json`
  );
  if (!fs.existsSync(file)) return res.status(404).end();

  res.json(JSON.parse(fs.readFileSync(file)));
});

app.post("/api/test/submit-answers", (req, res) => {
  try {
    const { testId, userName, totalQuestions, answers } = req.body;

    // ✅ always sanitize testId
    const cleanTestId = String(testId || "").replace(/\.pdf$/i, "");

    // ❗ do NOT block auto-submit
    if (!cleanTestId || !userName) {
      return res.status(400).json({
        ok: false,
        message: "Invalid payload",
      });
    }

    // ✅ SAFE answers (auto-submit may have empty answers)
    const safeAnswers = Array.isArray(answers) ? answers : [];

    // 📁 user root
    const userDir = path.join(EVAL_DIR, cleanTestId, userName);
    fs.mkdirSync(userDir, { recursive: true });

    // 🔢 detect next attempt number
    const attempts = fs
      .readdirSync(userDir)
      .filter((d) => d.startsWith("attempt-"));

    const attemptNo = attempts.length + 1;
    const attemptDir = path.join(userDir, `attempt-${attemptNo}`);
    fs.mkdirSync(attemptDir, { recursive: true });

    // 📝 submission object (ALWAYS CREATED)
    const submission = {
      testId: cleanTestId,
      userName,
      attempt: attemptNo,
      totalQuestions: Number(totalQuestions) || 0,
      answeredCount: safeAnswers.length,
      notAnsweredCount:
        (Number(totalQuestions) || 0) - safeAnswers.length,
      answers: safeAnswers,
      submittedAt: new Date().toISOString(),
    };

    fs.writeFileSync(
      path.join(attemptDir, "submission.json"),
      JSON.stringify(submission, null, 2)
    );

    return res.json({
      ok: true,
      attempt: attemptNo,
    });
  } catch (err) {
    console.error("🔥 Submit error:", err);
    return res.status(500).json({ ok: false });
  }
});

// 🔹 ADMIN – GET SUBMISSION (FOR EVALUATION)
app.get("/api/evaluation/submission/:testId/:userName/:attemptNo", (req, res) => {
  const { testId, userName, attemptNo } = req.params;
  const cleanTestId = testId.replace(/\.pdf$/i, "");

  const finalDir = path.join(EVAL_DIR, cleanTestId, userName, `attempt-${attemptNo}`);
  const reEvalDir = path.join(RE_EVAL_DIR, cleanTestId, userName, `attempt-${attemptNo}`);

  let attemptDir = reEvalDir;
  let isReEvaluation = true;

  if (!fs.existsSync(reEvalDir)) {
    attemptDir = finalDir;
    isReEvaluation = false;
  }

  const submissionFile = path.join(attemptDir, "submission.json");
  if (!fs.existsSync(submissionFile)) {
    return res.json({ ok: false });
  }

  const submission = JSON.parse(fs.readFileSync(submissionFile, "utf-8"));

  let evaluation = null;
  const evaluationFile = path.join(attemptDir, "evaluation.json");
  if (fs.existsSync(evaluationFile)) {
    const data = JSON.parse(fs.readFileSync(evaluationFile, "utf-8"));
    evaluation = data.evaluation;
    isReEvaluation = data.isReEvaluation ?? isReEvaluation;
  }

  res.json({
    ok: true,
    submission,
    evaluation,
    isReEvaluation,
    attempt: Number(attemptNo)
  });
});

// 🔹 USER – GET LATEST SUBMISSION
app.get("/api/evaluation/submission/:testId/:userName", (req, res) => {
  const { testId, userName } = req.params;
  const cleanTestId = testId.replace(/\.pdf$/i, "");

  const userDir = path.join(EVAL_DIR, cleanTestId, userName);
  if (!fs.existsSync(userDir)) return res.json({ ok: false });

  const attempts = fs
    .readdirSync(userDir)
    .filter(d => d.startsWith("attempt-"))
    .sort((a, b) => Number(a.split("-")[1]) - Number(b.split("-")[1]));

  if (!attempts.length) return res.json({ ok: false });

  const latest = attempts[attempts.length - 1];
  const attemptNo = Number(latest.split("-")[1]);

  const attemptDir = path.join(userDir, latest);
  const submission = JSON.parse(
    fs.readFileSync(path.join(attemptDir, "submission.json"), "utf-8")
  );

  let evaluation = null;
  const evalFile = path.join(attemptDir, "evaluation.json");
  if (fs.existsSync(evalFile)) {
    evaluation = JSON.parse(fs.readFileSync(evalFile, "utf-8")).evaluation;
  }

  res.json({ ok: true, submission, evaluation, attempt: attemptNo });
});



// 🔹 ADMIN – GET EVALUATION RESULT (SUMMARY ONLY)
// 🔹 ADMIN – GET EVALUATION RESULT (SUMMARY ONLY)
app.get("/api/evaluation/result/:testId/:userName", (req, res) => {
  const { testId, userName } = req.params;
  const cleanTestId = testId.replace(/\.pdf$/i, "");

  // ✅ FIXED PATH
  const userDir = path.join(EVAL_DIR, cleanTestId, userName);

  if (!fs.existsSync(userDir)) {
    return res.status(404).json({ ok: false, message: "User dir not found" });
  }

  const attempts = fs
    .readdirSync(userDir)
    .filter(d => d.startsWith("attempt-"))
    .sort((a, b) => Number(a.split("-")[1]) - Number(b.split("-")[1]));

  if (!attempts.length) {
    return res.status(404).json({ ok: false, message: "No attempts" });
  }

  const attemptNo = req.query.attempt || attempts[attempts.length - 1].split("-")[1];
  const evalFile = path.join(userDir, `attempt-${attemptNo}`, "evaluation.json");

  if (!fs.existsSync(evalFile)) {
    return res.status(404).json({ ok: false, message: "Evaluation not found" });
  }

  const data = JSON.parse(fs.readFileSync(evalFile, "utf-8"));
  res.json({ ok: true, summary: data.summary });
});






app.post("/api/evaluation/submit", (req, res) => {
  const { testId, userName, attemptNo, evaluation, summary } = req.body;

  const cleanTestId = testId.replace(/\.pdf$/i, "");

  const hasPending = Object.values(evaluation.topics).some(topic =>
    topic.questions.some(q => q.result === "pending")
  );

  const finalAttemptDir = path.join(
    EVAL_DIR,
    cleanTestId,
    userName,
    `attempt-${attemptNo}`
  );

  const reEvalAttemptDir = path.join(
    RE_EVAL_DIR,
    cleanTestId,
    userName,
    `attempt-${attemptNo}`
  );

  // ✅ IMPORTANT: if final evaluation → remove re-evaluation folder
  if (!hasPending && fs.existsSync(reEvalAttemptDir)) {
    fs.rmSync(reEvalAttemptDir, { recursive: true, force: true });
  }

  const targetDir = hasPending ? reEvalAttemptDir : finalAttemptDir;
  fs.mkdirSync(targetDir, { recursive: true });

  // ensure submission.json exists
  const submissionSrc = path.join(finalAttemptDir, "submission.json");
  const submissionDest = path.join(targetDir, "submission.json");

  if (!fs.existsSync(submissionDest) && fs.existsSync(submissionSrc)) {
    fs.copyFileSync(submissionSrc, submissionDest);
  }

  // calculate summary
  let correct = 0, incorrect = 0;
  Object.values(evaluation.topics).forEach(topic => {
    topic.questions.forEach(q => {
      if (q.result === "yes") correct++;
      else if (q.result === "no") incorrect++;
    });
  });

  const attempted = correct + incorrect;

  fs.writeFileSync(
    path.join(targetDir, "evaluation.json"),
    JSON.stringify({
      testId: cleanTestId,
      userName,
      attempt: attemptNo,
      evaluation,
      summary: {
        total: summary.total,
        correct,
        incorrect,
        attempted,
        pending: summary.total - attempted
      },
      evaluatedAt: new Date().toISOString(),
      isReEvaluation: hasPending
    }, null, 2)
  );

  res.json({ ok: true, isReEvaluation: hasPending });
});

// 🔥 ADMIN – DELETE REPORT (FROM BOTH evaluation & re_evaluation)
app.delete("/api/evaluation/delete", (req, res) => {
  try {
    const { testId, userName, attempt } = req.body;

    if (!testId || !userName || !attempt) {
      return res.status(400).json({ ok: false });
    }

    const cleanTestId = testId.replace(/\.pdf$/i, "");

    const evalAttemptPath = path.join(
      EVAL_DIR,
      cleanTestId,
      userName,
      `attempt-${attempt}`
    );

    const reEvalAttemptPath = path.join(
      RE_EVAL_DIR,
      cleanTestId,
      userName,
      `attempt-${attempt}`
    );

    // 🔥 Delete attempt folders
    if (fs.existsSync(evalAttemptPath)) {
      fs.rmSync(evalAttemptPath, { recursive: true, force: true });
    }

    if (fs.existsSync(reEvalAttemptPath)) {
      fs.rmSync(reEvalAttemptPath, { recursive: true, force: true });
    }

    // 🧹 CLEAN EMPTY USER FOLDERS
    const evalUserDir = path.join(EVAL_DIR, cleanTestId, userName);
    const reEvalUserDir = path.join(RE_EVAL_DIR, cleanTestId, userName);

    removeDirIfEmpty(evalUserDir);
    removeDirIfEmpty(reEvalUserDir);

    // 🧹 CLEAN EMPTY TEST FOLDERS
    const evalTestDir = path.join(EVAL_DIR, cleanTestId);
    const reEvalTestDir = path.join(RE_EVAL_DIR, cleanTestId);

    removeDirIfEmpty(evalTestDir);
    removeDirIfEmpty(reEvalTestDir);

    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    return res.status(500).json({ ok: false });
  }
});





// ───────────────────────────────────────────────────────────────────────────
// START SERVER
// ───────────────────────────────────────────────────────────────────────────

app.listen(PORT, "0.0.0.0", () => {
  const nets = os.networkInterfaces();
  const ip =
    Object.values(nets)
      .flat()
      .find((n) => n.family === "IPv4" && !n.internal)?.address || "localhost";

  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`🌍 LAN Access: http://${ip}:${PORT}`);
});
