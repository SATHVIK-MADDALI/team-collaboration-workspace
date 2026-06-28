const Workspace = require("../models/Workspace");
const User = require("../models/User");
const Task = require("../models/Task");
const Message = require("../models/Message");
const Notification = require("../models/Notification");

const createWorkspace = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({
                message: "Workspace name is required",
            });
        }

        const workspace = await Workspace.create({
            name,
            description,
            owner: req.user._id,
            members: [
                {
                    user: req.user._id,
                    role: "owner",
                },
            ],
        });

        res.status(201).json({
            message: "Workspace created successfully",
            workspace,
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

const getWorkspaces = async (req, res) => {
    try {
        const workspaces = await Workspace.find({
            "members.user": req.user._id,
        }).sort({ createdAt: -1 });

        res.status(200).json({
            count: workspaces.length,
            workspaces,
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

const getWorkspaceById = async (req, res) => {
    try {
        const workspace = await Workspace.findOne({
            _id: req.params.id,
            "members.user": req.user._id,
        });

        if (!workspace) {
            return res.status(404).json({
                message: "Workspace not found",
            });
        }

        res.status(200).json({
            workspace,
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

const updateWorkspace = async (req, res) => {
    try {
        const { name, description } = req.body;

        const workspace = await Workspace.findOne({
            _id: req.params.id,
            owner: req.user._id,
        });

        if (!workspace) {
            return res.status(404).json({
                message: "Workspace not found or you are not the owner",
            });
        }

        if (name !== undefined) {
            workspace.name = name;
        }

        if (description !== undefined) {
            workspace.description = description;
        }

        const updatedWorkspace = await workspace.save();

        res.status(200).json({
            message: "Workspace updated successfully",
            workspace: updatedWorkspace,
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

const deleteWorkspace = async (req, res) => {
    try {
        const workspace = await Workspace.findOne({
            _id: req.params.id,
            owner: req.user._id,
        });

        if (!workspace) {
            return res.status(404).json({
                message: "Workspace not found or you are not the owner",
            });
        }

        await workspace.deleteOne();
        await Task.deleteMany({ workspace: req.params.id });
        await Message.deleteMany({ workspace: req.params.id });
        await Notification.deleteMany({ workspace: req.params.id });

        res.status(200).json({
            message: "Workspace deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

const addWorkspaceMember = async (req, res) => {
    try {
        const { email, role } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Member email is required",
            });
        }

        const workspace = await Workspace.findOne({
            _id: req.params.id,
            owner: req.user._id,
        });

        if (!workspace) {
            return res.status(404).json({
                message: "Workspace not found or you are not the owner",
            });
        }

        const userToAdd = await User.findOne({ email });

        if (!userToAdd) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        const isAlreadyMember = workspace.members.some((member) =>
            member.user.equals(userToAdd._id)
        );

        if (isAlreadyMember) {
            return res.status(400).json({
                message: "User is already a workspace member",
            });
        }

        workspace.members.push({
            user: userToAdd._id,
            role: role || "member",
        });

        const updatedWorkspace = await workspace.save();

        res.status(200).json({
            message: "Member added successfully",
            workspace: updatedWorkspace,
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

const removeWorkspaceMember = async (req, res) => {
    try {
        const workspace = await Workspace.findOne({
            _id: req.params.id,
            owner: req.user._id,
        });

        if (!workspace) {
            return res.status(404).json({
                message: "Workspace not found or you are not the owner",
            });
        }

        if (workspace.owner.equals(req.params.userId)) {
            return res.status(400).json({
                message: "Workspace owner cannot be removed",
            });
        }

        const memberExists = workspace.members.some((member) =>
            member.user.equals(req.params.userId)
        );

        if (!memberExists) {
            return res.status(404).json({
                message: "Member not found in this workspace",
            });
        }

        workspace.members = workspace.members.filter(
            (member) => !member.user.equals(req.params.userId)
        );

        const updatedWorkspace = await workspace.save();

        res.status(200).json({
            message: "Member removed successfully",
            workspace: updatedWorkspace,
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

module.exports = {
    createWorkspace,
    getWorkspaces,
    getWorkspaceById,
    updateWorkspace,
    deleteWorkspace,
    addWorkspaceMember,
    removeWorkspaceMember,
};
