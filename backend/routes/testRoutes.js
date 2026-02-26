const express = require("express");
const router = express.Router();
const notifications = require("../notificationsStore");

router.post("/assign-test", (req, res) => {
  const { testId, users } = req.body;

  users.forEach((userId) => {
    if (!notifications[userId]) {
      notifications[userId] = [];
    }

    notifications[userId].push({
      id: Date.now() + Math.random(),
      title: "New Test Assigned",
      message:
        "You have been assigned a new assessment. Please click Start Test to begin.",
      testId,
      isRead: false,
      createdAt: new Date(),
    });
  });

  res.json({ ok: true });
});

module.exports = router;
