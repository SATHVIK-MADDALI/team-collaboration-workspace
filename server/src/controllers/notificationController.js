const Notification = require("../models/Notification");

const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({
            recipient: req.user._id,
        })
            .populate("workspace", "name")
            .populate("task", "title status")
            .sort({ createdAt: -1 });

        res.status(200).json({
            count: notifications.length,
            notifications,
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

const markNotificationAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOne({
            _id: req.params.id,
            recipient: req.user._id,
        });

        if (!notification) {
            return res.status(404).json({
                message: "Notification not found",
            });
        }

        notification.isRead = true;
        const updatedNotification = await notification.save();

        res.status(200).json({
            message: "Notification marked as read",
            notification: updatedNotification,
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

const markAllNotificationsAsRead = async (req, res) => {
    try {
        const result = await Notification.updateMany(
            {
                recipient: req.user._id,
                isRead: false,
            },
            {
                isRead: true,
            }
        );

        res.status(200).json({
            message: "All notifications marked as read",
            modifiedCount: result.modifiedCount,
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

module.exports = {
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
};
