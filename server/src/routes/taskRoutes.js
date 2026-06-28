const express = require("express");

const {
    createTask,
    getTasks,
    getTaskStats,
    getTaskById,
    updateTask,
    deleteTask,
} = require("../controllers/taskController");
const { protect } = require("../middleware/authMiddleware");
const validateObjectId = require("../middleware/validateObjectId");

const router = express.Router({ mergeParams: true });

router.post("/", protect, validateObjectId("workspaceId"), createTask);
router.get("/", protect, validateObjectId("workspaceId"), getTasks);
router.get("/stats", protect, validateObjectId("workspaceId"), getTaskStats);
router.get(
    "/:taskId",
    protect,
    validateObjectId("workspaceId"),
    validateObjectId("taskId"),
    getTaskById
);
router.put(
    "/:taskId",
    protect,
    validateObjectId("workspaceId"),
    validateObjectId("taskId"),
    updateTask
);
router.delete(
    "/:taskId",
    protect,
    validateObjectId("workspaceId"),
    validateObjectId("taskId"),
    deleteTask
);

module.exports = router;
