// frontend/src/api/api.js

/* ========================================================================= */
/* 🌐 BACKEND API URL CONFIG (EDIT ONLY THIS SECTION)                        */
/* ========================================================================= */



// All endpoint paths (no domain, only routes)
// MAIN BACKEND URL
import axios from "axios";

export const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || "http://192.168.1.100:5000";

export const API_ROUTES = {
  // LOGIN / LOGOUT
  login: "/api/login",
  userLogout: "/api/user/logout",

  // PASSWORD RESET (⭐ ADD THESE)
  sendOtp: "/api/send-otp",
  resetPassword: "/api/reset-password",

  // USERS (Admin)
  users: "/api/users",
  userHistory: "/api/admin/userHistory",

  // Chat Sessions
  listSessions: "/api/sessions",                    // + /:username
  createSession: "/api/session/create",
  addMessage: "/api/session/addMessage",
  batchAddMessage: "/api/session/batchAddMessage",
  loadSession: "/api/session",                      // + /:username/:id
  renameSession: "/api/session/rename",
  deleteSession: "/api/session",                    // + /:username/:id


  // CREATE TEST (PDF DOCUMENTS)
testDocuments: "/api/test-documents",


  // PDFs
  pdfs: "/api/pdfs",

  /* ---------------------------------------------------
      ⭐ FullStack Training (New)
  --------------------------------------------------- */
 fullstackDayFiles: "/api/fullstack/dayfiles",
  fullstackDays: "/api/fullstack/days",

   /* ---------------------------------------------------
      ⭐ Data-Science Training (New)
  --------------------------------------------------- */
  dataScienceDayFiles: "/api/datascience/dayfiles",
  dataScienceDays: "/api/datascience/days",

  // Day files (Training Docs + Videos)
  dayFiles: "/api/dayfiles",
  allDays: "/api/allDays",

  // 🔔 NOTIFICATIONS
notificationsUnreadCount: "/api/notifications/unread-count",
notificationsList: "/api/notifications",
markNotificationRead: "/api/notifications/mark-read",

// 📝 ASSIGN TEST
assignTest: "/api/assign-test",


  // TEMP CHAT
  tempToggle: "/api/tempChat/toggle",
  tempStatus: "/api/tempChat/status",
  tempSavePair: "/api/tempChat/savePair",
  tempAll: "/api/tempChat/all",
  tempApprove: "/api/tempChat/approve",
  tempDelete: "/api/tempChat/delete",

  // GLOBAL SEARCH
  globalSearch: "/api/globalSearch",
};


/* Helper: join base URL + route */
function url(path) {
  return `${BACKEND_URL}${path}`;
}

/* Get logged-in username */
function getUsername() {
  return localStorage.getItem("email");
}

/* ========================================================================= */
/* 🌐 CHATBOT API                                                             */
/* ========================================================================= */

export async function sendMessageToBot(message) {
  const response = await fetch(url(API_ROUTES.chat), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) throw new Error("Network response was not ok");
  return response.json();
}
/* ========================================================================= */
/* data science schedule PDF LIST                                            */
/* ========================================================================= */
    export async function getDataScienceSchedule() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/datascience/schedule`);
    return res.json();
  } catch {
    return [];
  }
}

/* ========================================================================= */
/* full stack schedule PDF LIST                                              */
/* ========================================================================= */

export async function getFullStackSchedule() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/fullstack/schedule`);
    return res.json();
  } catch {
    return [];
  }
}

/* ========================================================================= */
/* PDF LIST                                                                   */
/* ========================================================================= */

export async function getPdfFiles() {
  try {
    const res = await fetch(url(API_ROUTES.pdfs));
    if (!res.ok) throw new Error("Failed to load PDFs");
    return res.json();
  } catch {
    return [];
  }
}

/* ========================================================================= */
/* DAY FILES (PDF + VIDEO)                                                    */
/* ========================================================================= */

export async function getDayFiles(day) {
  try {
    const res = await fetch(url(`${API_ROUTES.dayFiles}/${day}`));
    if (!res.ok) throw new Error("Failed to load day files");
    return res.json();
  } catch {
    return { pdfs: [], videos: [] };
  }
}

/* ========================================================================= */
/* LIST ALL DAY FOLDERS                                                       */
/* ========================================================================= */

export async function listAllDays() {
  try {
    const res = await fetch(url(API_ROUTES.allDays));
    return res.json();
  } catch {
    return [];
  }
}

/* ⭐ FULL-STACK — DAY FILES (PDF + VIDEO)                                     */
/* ========================================================================= */
export async function getFullStackDayFiles(day) {
  try {
    const res = await fetch(url(`${API_ROUTES.fullstackDayFiles}/${day}`));
    return res.json();
  } catch {
    return { pdfs: [], videos: [] };
  }
}


/* ========================================================================= */
/* ⭐ FULL-STACK — LIST ALL DAY FOLDERS                                        */
/* ========================================================================= */
export async function listFullStackDays() {
  try {
    const res = await fetch(url(API_ROUTES.fullstackDays));
    return res.json();
  } catch {
    return [];
  }
}


/* ⭐ FULL-STACK — DAY FILES (PDF + VIDEO)                                     */
/* ========================================================================= */
export async function getDataScienceDayFiles(day) {
  try {
    const res = await fetch(url(`${API_ROUTES.dataScienceDayFiles}/${day}`));
    return res.json();
  } catch {
    return { pdfs: [], videos: [] };
  }
}



/* ========================================================================= */
/* ⭐ data-science — LIST ALL DAY FOLDERS                                        */
/* ========================================================================= */
export async function listDataScienceDays() {
  try {
    const res = await fetch(url(API_ROUTES.datascienceDays));
    return res.json();
  } catch {
    return [];
  }
}

/* ========================================================================= */
/* PER-USER JSON CHAT SYSTEM                                                  */
/* ========================================================================= */

export async function listSessions() {
  const username = getUsername();
  if (!username) return [];
  try {
    return fetch(url(`${API_ROUTES.listSessions}/${username}`)).then((r) => r.json());
  } catch {
    return [];
  }
}

export async function createSession(name = "") {
  const username = getUsername();
  if (!username) return null;

  return fetch(url(API_ROUTES.createSession), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, name }),
  }).then((r) => r.json());
}

export async function addMessageToSession(sessionId, message) {
  const username = getUsername();
  if (!username) return { success: false };

  return fetch(url(API_ROUTES.addMessage), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      sessionId,
      sender: message.sender,
      text: message.text,
      table: message.table || null,
      image: message.image || null,
      allTables: message.allTables || null,  // ✅ ADD THIS
      allImages: message.allImages || null   // ✅ ADD THIS
    }),
  }).then((r) => r.json());
}

export async function batchAddMessage(messagesArray) {
  const username = getUsername();
  if (!username) return { success: false };

  return fetch(url(API_ROUTES.batchAddMessage), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, messages: messagesArray }),
  }).then((r) => r.json());
}

export async function loadSession(sessionId, offset = 0, limit = 20) {
  const username = getUsername();
  if (!username) return { messages: [] };

  return fetch(
    url(`${API_ROUTES.loadSession}/${username}/${sessionId}?offset=${offset}&limit=${limit}`)
  ).then((r) => r.json());
}

export async function renameSession(sessionId, newName) {
  const username = getUsername();
  if (!username) return { success: false };

  return fetch(url(API_ROUTES.renameSession), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, sessionId, newName }),
  }).then((r) => r.json());
}

export async function deleteSession(sessionId) {
  const username = getUsername();
  if (!username) return { success: false };

  return fetch(url(`${API_ROUTES.deleteSession}/${username}/${sessionId}`), {
    method: "DELETE",
  }).then((r) => r.json());
}

export const assignTest = async (testId, pdfFileName, userIds) => {
  const res = await axios.post(
    `${BACKEND_URL}/api/assign-test`,
    {
      testId,
      doc: pdfFileName,   // ⭐ matches backend
      users: userIds,
    }
  );

  return res.data;
};



export async function getUnreadNotificationCount(userId) {
  return fetch(
    url(`${API_ROUTES.notificationsUnreadCount}/${userId}`)
  ).then((r) => r.json());
}

export async function getNotifications(userId) {
  return fetch(
    url(`${API_ROUTES.notificationsList}/${userId}`)
  ).then((r) => r.json());
}

export async function markNotificationRead(userId, notificationId) {
  return fetch(url(API_ROUTES.markNotificationRead), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, notificationId }),
  }).then((r) => r.json());
}


/* ========================================================================= */
/* 🔥 ADMIN – USER MANAGEMENT                                                 */
/* ========================================================================= */

export async function editUser(userId, updateData) {
  return fetch(url(`${API_ROUTES.users}/${userId}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updateData),
  }).then((r) => r.json());
}

export async function deleteUser(userId) {
  return fetch(url(`${API_ROUTES.users}/${userId}`), {
    method: "DELETE",
  }).then((r) => r.json());
}

export async function addUser(data) {
  return fetch(url(API_ROUTES.users), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((r) => r.json());
}

export async function getUserHistory(email) {
  return fetch(url(`${API_ROUTES.userHistory}/${email}`)).then((r) => r.json());
}

/* ========================================================================= */
/* ⭐ CREATE TEST — PDF DOCUMENT LIST                                         */
/* ========================================================================= */

export async function getTestDocuments() {
  try {
    const res = await fetch(url(API_ROUTES.testDocuments));
    if (!res.ok) throw new Error("Failed to load test documents");
    return res.json();
  } catch {
    return { ok: false, documents: [] };
  }
}


/* ========================================================================= */
/* TEMPORARY CHAT STORAGE                                                     */
/* ========================================================================= */

export async function setTempChatReceiving(enabled) {
  return fetch(url(API_ROUTES.tempToggle), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled }),
  }).then((r) => r.json());
}

export async function getTempChatStatus() {
  return fetch(url(API_ROUTES.tempStatus)).then((r) => r.json());
}

export async function saveTempPair(user, ai) {
  return fetch(url(API_ROUTES.tempSavePair), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userText: user, aiText: ai }),
  }).then((r) => r.json());
}

export async function getAllTempChats() {
  return fetch(url(API_ROUTES.tempAll)).then((r) => r.json());
}

export async function approveTempChat(id) {
  return fetch(url(`${API_ROUTES.tempApprove}/${id}`), { method: "POST" }).then((r) => r.json());
}

export async function deleteTempChat(id) {
  return fetch(url(`${API_ROUTES.tempDelete}/${id}`), { method: "DELETE" }).then((r) => r.json());
}

export async function saveTempMessage(msg) {
  return fetch(url(API_ROUTES.tempSavePair), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(msg),
  }).then((r) => r.json());
}


/* ========================================================================= */
/* ⭐ FORGOT PASSWORD / OTP API                                              */
/* ========================================================================= */

export async function sendOtp(email) {
  return fetch(url(API_ROUTES.sendOtp), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  }).then((r) => r.json());
}

export async function resetPassword(email, otp, password) {
  return fetch(url(API_ROUTES.resetPassword), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp, password }),
  }).then((r) => r.json());
}

/* ========================================================================= */
/* GLOBAL SEARCH                                                              */
/* ========================================================================= */

export async function globalSearch(query) {
  return fetch(url(`${API_ROUTES.globalSearch}?q=${encodeURIComponent(query)}`)).then((r) =>
    r.json()
  );
}
