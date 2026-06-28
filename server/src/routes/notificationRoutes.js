const express = require("express");

const {
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
} = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");
const validateObjectId = require("../middleware/validateObjectId");

const router = express.Router();

router.get("/", protect, getNotifications);
router.put("/read-all", protect, markAllNotificationsAsRead);
router.put("/:id/read", protect, validateObjectId("id"), markNotificationAsRead);

module.exports = router;
