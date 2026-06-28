const { Server } = require("socket.io");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Workspace = require("../models/Workspace");

const initializeSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST", "PUT", "DELETE"],
        },
    });

    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;

            if (!token) {
                return next(new Error("Socket authentication token missing"));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select("-password");

            if (!user) {
                return next(new Error("Socket user not found"));
            }

            socket.user = user;
            next();
        } catch (error) {
            next(new Error("Socket authentication failed"));
        }
    });

    io.on("connection", (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        socket.on("joinUser", () => {
            socket.join(socket.user._id.toString());
            console.log(`Socket ${socket.id} joined user room ${socket.user._id}`);
        });

        socket.on("joinWorkspace", async (workspaceId) => {
            if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
                return socket.emit("socketError", {
                    message: "Invalid workspace id",
                });
            }

            const workspace = await Workspace.findOne({
                _id: workspaceId,
                "members.user": socket.user._id,
            });

            if (!workspace) {
                return socket.emit("socketError", {
                    message: "You are not allowed to join this workspace",
                });
            }

            socket.join(workspaceId);
            console.log(`Socket ${socket.id} joined workspace ${workspaceId}`);
        });

        socket.on("leaveWorkspace", (workspaceId) => {
            socket.leave(workspaceId);
            console.log(`Socket ${socket.id} left workspace ${workspaceId}`);
        });

        socket.on("disconnect", () => {
            console.log(`Socket disconnected: ${socket.id}`);
        });
    });

    return io;
};

module.exports = initializeSocket;
