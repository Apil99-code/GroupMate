import Notification from '../models/Notification.js';
import FriendRequest from "../models/friendRequest.model.js";

// Get all notifications for the logged-in user
export const getNotifications = async (req, res) => {
  const userId = req.user._id;
  // Get pending friend requests sent to this user
  const friendRequests = await FriendRequest.find({ to: userId, status: "pending" })
    .populate("from", "fullName profilePic")
    .sort({ createdAt: -1 });

  // Format friend requests as notifications
  const friendRequestNotifications = friendRequests.map((req) => ({
    _id: req._id,
    type: "friend_request",
    from: req.from,
    createdAt: req.createdAt,
    read: false, // You can add a read field if you want
    message: "",
  }));

  // Get all other notifications for the user
  const otherNotifications = await Notification.find({ user: userId })
    .sort({ createdAt: -1 })
    .lean();

  // Merge and sort all notifications by createdAt descending
  const allNotifications = [
    ...friendRequestNotifications,
    ...otherNotifications
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json(allNotifications);
};

// Mark a single notification as read
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.findByIdAndUpdate(id, { read: true });
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark as read' });
  }
};

// Mark all notifications as read for the user
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark all as read' });
  }
};

// Create a notification (for testing/demo)
export const createNotification = async (req, res) => {
  try {
    const { type, title, message } = req.body;
    const notification = await Notification.create({
      user: req.user._id,
      type,
      title,
      message
    });
    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create notification' });
  }
}; 