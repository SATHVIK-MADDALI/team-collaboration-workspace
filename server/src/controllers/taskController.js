const Task = require("../models/Task");
const Workspace = require("../models/Workspace");
const Notification = require("../models/Notification");

const createTaskAssignmentNotification = async ({
    io,
    workspaceId,
    task,
    assignedTo,
    assignedBy,
}) => {
    if (!assignedTo || assignedTo.toString() === assignedBy.toString()) {
        return;
    }

    const notification = await Notification.create({
        recipient: assignedTo,
        workspace: workspaceId,
        task: task._id,
        type: "task-assigned",
        message: `You were assigned a task: ${task.title}`,
    });

    io.to(assignedTo.toString()).emit("notificationCreated", notification);
};

const createTask = async (req, res) => {
    try {
        const { title, description, status, priority, assignedTo, dueDate } = req.body;
        const { workspaceId } = req.params;

        if (!title) {
            return res.status(400).json({
                message: "Task title is required",
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

        if (assignedTo) {
            const isAssigneeMember = workspace.members.some((member) =>
                member.user.equals(assignedTo)
            );

            if (!isAssigneeMember) {
                return res.status(400).json({
                    message: "Assigned user must be a workspace member",
                });
            }
        }

        const task = await Task.create({
            title,
            description,
            status,
            priority,
            workspace: workspaceId,
            assignedTo: assignedTo || null,
            createdBy: req.user._id,
            dueDate: dueDate || null,
        });

        const io = req.app.get("io");
        io.to(workspaceId).emit("taskCreated", task);
        await createTaskAssignmentNotification({
            io,
            workspaceId,
            task,
            assignedTo: task.assignedTo,
            assignedBy: req.user._id,
        });

        res.status(201).json({
            message: "Task created successfully",
            task,
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

const getTasks = async (req, res) => {
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

        const tasks = await Task.find({ workspace: workspaceId })
            .populate("assignedTo", "name email")
            .populate("createdBy", "name email")
            .sort({ createdAt: -1 });

        res.status(200).json({
            count: tasks.length,
            tasks,
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

const getTaskStats = async (req, res) => {
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

        const [total, todo, inProgress, done, highPriority] = await Promise.all([
            Task.countDocuments({ workspace: workspaceId }),
            Task.countDocuments({ workspace: workspaceId, status: "todo" }),
            Task.countDocuments({ workspace: workspaceId, status: "in-progress" }),
            Task.countDocuments({ workspace: workspaceId, status: "done" }),
            Task.countDocuments({ workspace: workspaceId, priority: "high" }),
        ]);

        res.status(200).json({
            total,
            byStatus: {
                todo,
                inProgress,
                done,
            },
            highPriority,
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

const getTaskById = async (req, res) => {
    try {
        const { workspaceId, taskId } = req.params;

        const workspace = await Workspace.findOne({
            _id: workspaceId,
            "members.user": req.user._id,
        });

        if (!workspace) {
            return res.status(404).json({
                message: "Workspace not found or you are not a member",
            });
        }

        const task = await Task.findOne({
            _id: taskId,
            workspace: workspaceId,
        })
            .populate("assignedTo", "name email")
            .populate("createdBy", "name email");

        if (!task) {
            return res.status(404).json({
                message: "Task not found",
            });
        }

        res.status(200).json({
            task,
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

const updateTask = async (req, res) => {
    try {
        const { workspaceId, taskId } = req.params;
        const { title, description, status, priority, assignedTo, dueDate } = req.body;

        const workspace = await Workspace.findOne({
            _id: workspaceId,
            "members.user": req.user._id,
        });

        if (!workspace) {
            return res.status(404).json({
                message: "Workspace not found or you are not a member",
            });
        }

        const task = await Task.findOne({
            _id: taskId,
            workspace: workspaceId,
        });

        if (!task) {
            return res.status(404).json({
                message: "Task not found",
            });
        }

        if (assignedTo) {
            const isAssigneeMember = workspace.members.some((member) =>
                member.user.equals(assignedTo)
            );

            if (!isAssigneeMember) {
                return res.status(400).json({
                    message: "Assigned user must be a workspace member",
                });
            }
        }

        if (title !== undefined) {
            task.title = title;
        }

        if (description !== undefined) {
            task.description = description;
        }

        if (status !== undefined) {
            task.status = status;
        }

        if (priority !== undefined) {
            task.priority = priority;
        }

        if (assignedTo !== undefined) {
            task.assignedTo = assignedTo || null;
        }

        if (dueDate !== undefined) {
            task.dueDate = dueDate || null;
        }

        const updatedTask = await task.save();

        const io = req.app.get("io");
        io.to(workspaceId).emit("taskUpdated", updatedTask);
        await createTaskAssignmentNotification({
            io,
            workspaceId,
            task: updatedTask,
            assignedTo: updatedTask.assignedTo,
            assignedBy: req.user._id,
        });

        res.status(200).json({
            message: "Task updated successfully",
            task: updatedTask,
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

const deleteTask = async (req, res) => {
    try {
        const { workspaceId, taskId } = req.params;

        const workspace = await Workspace.findOne({
            _id: workspaceId,
            "members.user": req.user._id,
        });

        if (!workspace) {
            return res.status(404).json({
                message: "Workspace not found or you are not a member",
            });
        }

        const task = await Task.findOne({
            _id: taskId,
            workspace: workspaceId,
        });

        if (!task) {
            return res.status(404).json({
                message: "Task not found",
            });
        }

        await task.deleteOne();

        const io = req.app.get("io");
        io.to(workspaceId).emit("taskDeleted", {
            taskId,
            workspace: workspaceId,
        });

        res.status(200).json({
            message: "Task deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

module.exports = {
    createTask,
    getTasks,
    getTaskStats,
    getTaskById,
    updateTask,
    deleteTask,
};
