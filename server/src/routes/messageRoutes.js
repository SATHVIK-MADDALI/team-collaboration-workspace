const express = require("express");

const {
    sendMessage,
    getMessages,
} = require("../controllers/messageController");
const { protect } = require("../middleware/authMiddleware");
const validateObjectId = require("../middleware/validateObjectId");

const router = express.Router({ mergeParams: true });

router.post("/", protect, validateObjectId("workspaceId"), sendMessage);
router.get("/", protect, validateObjectId("workspaceId"), getMessages);

module.exports = router;
