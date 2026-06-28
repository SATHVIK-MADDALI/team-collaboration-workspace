const express = require("express");
const cors = require("cors");
const http = require("http");
require("dotenv").config();

const connectDB = require("./src/config/db");
const initializeSocket = require("./src/config/socket");
const authRoutes = require("./src/routes/authRoutes");
const workspaceRoutes = require("./src/routes/workspaceRoutes");
const taskRoutes = require("./src/routes/taskRoutes");
const messageRoutes = require("./src/routes/messageRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");
const { notFound, errorHandler } = require("./src/middleware/errorMiddleware");

const app = express();
const server = http.createServer(app);
const io = initializeSocket(server);

connectDB();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("API running");
});

app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/workspaces/:workspaceId/tasks", taskRoutes);
app.use("/api/workspaces/:workspaceId/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);

app.set("io", io);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
