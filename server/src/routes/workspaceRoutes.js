const express = require("express");

const {
    createWorkspace,
    getWorkspaces,
    getWorkspaceById,
    updateWorkspace,
    deleteWorkspace,
    addWorkspaceMember,
    removeWorkspaceMember,
} = require("../controllers/workspaceController");
const { protect } = require("../middleware/authMiddleware");
const validateObjectId = require("../middleware/validateObjectId");

const router = express.Router();

router.post("/", protect, createWorkspace);
router.get("/", protect, getWorkspaces);
router.get("/:id", protect, validateObjectId("id"), getWorkspaceById);
router.put("/:id", protect, validateObjectId("id"), updateWorkspace);
router.delete("/:id", protect, validateObjectId("id"), deleteWorkspace);
router.post("/:id/members", protect, validateObjectId("id"), addWorkspaceMember);
router.delete(
    "/:id/members/:userId",
    protect,
    validateObjectId("id"),
    validateObjectId("userId"),
    removeWorkspaceMember
);

module.exports = router;
