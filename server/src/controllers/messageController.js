const Message = require("../models/Message");
const Workspace = require("../models/Workspace");

const sendMessage = async (req, res) => {
    try {
        const { workspaceId } = req.params;
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({
                message: "Message content is required",
            });
        }

        const workspace = await Workspace.findOne({
            _id: workspaceId,
            "members.user": req.user._id,
        });

        if (!workspace) {
            return res.status(404).json({
                message: "Workspace not found or you are not a member",
            });
        }

        const message = await Message.create({
            workspace: workspaceId,
            sender: req.user._id,
            content,
        });

        const populatedMessage = await message.populate("sender", "name email");

        const io = req.app.get("io");
        io.to(workspaceId).emit("messageCreated", populatedMessage);

        res.status(201).json({
            message: "Message sent successfully",
            chatMessage: populatedMessage,
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

const getMessages = async (req, res) => {
    try {
        const { workspaceId } = req.params;

        const workspace = await Workspace.findOne({
            _id: workspaceId,
            "members.user": req.user._id,
        });

        if (!workspace) {
            return res.status(404).json({
                message: "Workspace not found or you are not a member",
            });
        }

        const messages = await Message.find({ workspace: workspaceId })
            .populate("sender", "name email")
            .sort({ createdAt: 1 });

        res.status(200).json({
            count: messages.length,
            messages,
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

module.exports = {
    sendMessage,
    getMessages,
};
