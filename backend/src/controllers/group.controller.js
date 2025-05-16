import Group from "../models/group.model.js";
import Message from "../models/message.model.js";
import { emitGroupMessage } from "../lib/socket.js";
import cloudinary from "../lib/cloudinary.js";
import User from "../models/user.model.js";
import Notification from '../models/Notification.js';

export const createGroup = async (req, res) => {
  try {
    const { name, memberIds } = req.body;
    const creatorId = req.user._id;

    // Add creator to members if not already included
    if (!memberIds.includes(creatorId)) {
      memberIds.push(creatorId);
    }

    const newGroup = new Group({
      name,
      members: memberIds,
    });

    await newGroup.save();

    // Notify all members
    for (const memberId of memberIds) {
      await Notification.create({
        user: memberId,
        type: 'trip',
        title: 'Group Created',
        message: `You have been added to the group "${name}".`
      });
    }

    // Populate members info
    const populatedGroup = await Group.findById(newGroup._id)
      .populate("members", "username fullName email profilePic");

    res.status(201).json(populatedGroup);
  } catch (error) {
    console.error("Error in createGroup: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getGroups = async (req, res) => {
  try {
    const userId = req.user._id;

    const groups = await Group.find({ members: userId })
      .populate("members", "username fullName email profilePic")
      .sort({ updatedAt: -1 });

    res.status(200).json(groups);
  } catch (error) {
    console.error("Error in getGroups: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendGroupMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { text, type = 'text', metadata = {}, image } = req.body;
    const senderId = req.user._id;

    if (!groupId || !senderId) {
      return res.status(400).json({ error: "Invalid group or sender" });
    }

    // Check if group exists and user is a member
    const group = await Group.findOne({
      _id: groupId,
      members: senderId
    });
    
    if (!group) {
      return res.status(404).json({ error: "Group not found or you're not a member" });
    }

    let imageUrl;
    if (image) {
      try {
        const uploadResponse = await cloudinary.uploader.upload(image, {
          folder: "group-messages",
        });
        imageUrl = uploadResponse.secure_url;
      } catch (uploadError) {
        console.error("Failed to upload image:", uploadError);
        return res.status(500).json({ error: "Failed to upload image", details: uploadError.message });
      }
    }

    // Create new message using Message model
    const newMessage = new Message({
      text,
      senderId,
      groupId,
      type,
      metadata,
      image: imageUrl
    });

    await newMessage.save();

    // Populate sender info with required fields
    const populatedMessage = await Message.findById(newMessage._id)
      .populate('senderId', 'username fullName profilePic email');

    // Update group's last activity
    group.lastActivity = new Date();
    await group.save();

    // Notify all group members except sender
    for (const memberId of group.members) {
      if (memberId.toString() !== senderId.toString()) {
        await Notification.create({
          user: memberId,
          type: 'message',
          title: 'New Group Message',
          message: `New message in group "${group.name}".`
        });
      }
    }

    // Emit the message to all group members
    emitGroupMessage(groupId, populatedMessage);

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Error in sendGroupMessage: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    if (!groupId || !userId) {
      return res.status(400).json({ error: "Invalid group or user" });
    }
    
    // Check if group exists and user is a member
    const group = await Group.findOne({
      _id: groupId,
      members: userId
    });
    
    if (!group) {
      return res.status(404).json({ error: "Group not found or you're not a member" });
    }

    // Get messages using Message model with pagination and populate sender info
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ groupId })
      .populate('senderId', 'username fullName profilePic email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalMessages = await Message.countDocuments({ groupId });

    res.status(200).json({
      messages: messages.reverse(), // Reverse to show oldest first
      totalMessages,
      currentPage: page,
      totalPages: Math.ceil(totalMessages / limit)
    });
  } catch (error) {
    console.error("Error in getGroupMessages: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const assignRole = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId, role } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const member = group.members.find((member) => member.userId.toString() === userId);
    if (!member) {
      return res.status(404).json({ message: "User not found in group" });
    }

    member.role = role;
    await group.save();

    res.status(200).json(group);
  } catch (error) {
    res.status(500).json({ message: "Failed to assign role", error: error.message });
  }
};

export const getGroupActivityLog = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId).populate("activityLog.userId", "username");
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    res.status(200).json(group.activityLog);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch activity log", error: error.message });
  }
};

export const updateGroupName = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { newName } = req.body;
    const userId = req.user._id;

    if (!newName || !newName.trim()) {
      return res.status(400).json({ error: "New group name is required" });
    }

    const group = await Group.findOne({
      _id: groupId,
      members: userId
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found or you're not a member" });
    }

    const oldName = group.name;
    group.name = newName.trim();

    // Add to activity log
    if (!group.activityLog) {
      group.activityLog = [];
    }
    
    group.activityLog.push({
      userId,
      action: "rename",
      details: `Group renamed from "${oldName}" to "${newName.trim()}"`,
      timestamp: new Date()
    });

    await group.save();

    // Populate the updated group with member info
    const updatedGroup = await Group.findById(groupId)
      .populate("members", "username fullName email profilePic");

    res.status(200).json(updatedGroup);
  } catch (error) {
    console.error("Error in updateGroupName: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const addGroupMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { email } = req.body;
    const userId = req.user._id;

    const group = await Group.findOne({
      _id: groupId,
      members: userId
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found or you're not a member" });
    }

    // Find user by email
    const newMember = await User.findOne({ email });
    if (!newMember) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user is already a member
    if (group.members.includes(newMember._id)) {
      return res.status(400).json({ error: "User is already a member of this group" });
    }

    group.members.push(newMember._id);
    await group.save();

    // Add notification for the new member
    await Notification.create({
      user: newMember._id,
      type: 'trip',
      title: 'Added to Group',
      message: `You have been added to the group "${group.name}".`
    });

    // Add to activity log
    group.activityLog.push({
      userId,
      action: "add_member",
      details: `Added ${newMember.username} to the group`,
      timestamp: new Date()
    });
    await group.save();

    res.status(200).json(group);
  } catch (error) {
    console.error("Error in addGroupMember: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const removeGroupMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberId } = req.body;
    const userId = req.user._id;

    const group = await Group.findOne({
      _id: groupId,
      members: userId
    }).populate("members", "username fullName email profilePic");

    if (!group) {
      return res.status(404).json({ error: "Group not found or you're not a member" });
    }

    // Check if the member exists in the group
    const memberExists = group.members.some(member => member._id.toString() === memberId);
    if (!memberExists) {
      return res.status(404).json({ error: "Member not found in group" });
    }

    // Convert IDs to strings for comparison
    const userIdStr = userId.toString();
    const memberIdStr = memberId.toString();
    const adminId = group.members[0]._id.toString();

    // Allow self-removal or admin removing others
    const isSelfRemoval = userIdStr === memberIdStr;
    const isAdmin = userIdStr === adminId;

    if (!isSelfRemoval && !isAdmin) {
      return res.status(403).json({ error: "Only the group admin can remove other members" });
    }

    // Handle admin leaving
    if (memberIdStr === adminId) {
      if (group.members.length <= 1) {
        await Group.findByIdAndDelete(groupId);
        return res.status(200).json({ message: "Group deleted as last member left" });
      }
    }

    // Remove member
    group.members = group.members.filter(member => member._id.toString() !== memberIdStr);
    await group.save();

    // Add to activity log
    const removedUser = group.members.find(m => m._id.toString() === memberIdStr) || await User.findById(memberId);
    group.activityLog.push({
      userId,
      action: "remove_member",
      details: isSelfRemoval
        ? `${removedUser.username || removedUser.fullName} left the group`
        : `${removedUser.username || removedUser.fullName} was removed from the group`,
      timestamp: new Date()
    });
    await group.save();

    // Populate and return updated group
    const updatedGroup = await Group.findById(groupId)
      .populate("members", "username fullName email profilePic");

    res.status(200).json(updatedGroup);
  } catch (error) {
    console.error("Error in removeGroupMember: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    // Find the group and verify user is a member
    const group = await Group.findOne({
      _id: groupId,
      members: userId
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found or you're not a member" });
    }

    // Delete the group
    await Group.findByIdAndDelete(groupId);

    res.status(200).json({ message: "Group deleted successfully" });
  } catch (error) {
    console.error("Error in deleteGroup: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const addMessageReaction = async (req, res) => {
  const { groupId, messageId } = req.params;
  const { emoji } = req.body;
  const userId = req.user._id;

  // Find the group and message
  const group = await Group.findById(groupId);
  if (!group) return res.status(404).json({ message: "Group not found" });

  const message = group.messages.id(messageId);
  if (!message) return res.status(404).json({ message: "Message not found" });

  // Add or update reaction
  let reaction = message.reactions.find(r => r.emoji === emoji);
  if (reaction) {
    // Prevent duplicate reactions by the same user
    if (!reaction.userIds.includes(userId)) {
      reaction.userIds.push(userId);
    }
  } else {
    message.reactions.push({ emoji, userIds: [userId] });
  }

  await group.save();
  res.json({ success: true, message: "Reaction added" });
};