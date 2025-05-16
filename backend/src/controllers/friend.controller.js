import User from "../models/user.model.js";
import FriendRequest from "../models/friendRequest.model.js";

// Search users by name (excluding self and already-friends)
export const searchUsers = async (req, res) => {
  const { name } = req.query;
  const userId = req.user._id;

  // Get current user's friends
  const user = await User.findById(userId);
  const friends = user.friends.map(f => f.toString());

  // Find users matching name, not self, not already friends
  const users = await User.find({
    _id: { $ne: userId, $nin: friends },
    fullName: { $regex: name, $options: "i" }
  }).select("_id fullName profilePic");

  res.json(users);
};

// Send friend request
export const sendFriendRequest = async (req, res) => {
  const from = req.user._id;
  const { to } = req.body;

  // Prevent duplicate requests
  const existing = await FriendRequest.findOne({ from, to, status: "pending" });
  if (existing) return res.status(400).json({ message: "Request already sent" });

  await FriendRequest.create({ from, to });
  res.json({ message: "Friend request sent" });
};

// Get friends
export const getFriends = async (req, res) => {
  const user = await User.findById(req.user._id).populate("friends", "_id fullName profilePic");
  res.json(user.friends);
};

// Get pending friend requests (notifications)
export const getFriendRequests = async (req, res) => {
  const requests = await FriendRequest.find({ to: req.user._id, status: "pending" })
    .populate("from", "_id fullName profilePic");
  res.json(requests);
};

// Accept friend request
export const acceptFriendRequest = async (req, res) => {
  const to = req.user._id;
  const { from } = req.body;

  const request = await FriendRequest.findOneAndUpdate(
    { from, to, status: "pending" },
    { status: "accepted" }
  );
  if (!request) return res.status(404).json({ message: "Request not found" });

  // Add each other as friends
  await User.findByIdAndUpdate(from, { $addToSet: { friends: to } });
  await User.findByIdAndUpdate(to, { $addToSet: { friends: from } });

  res.json({ message: "Friend request accepted" });
};