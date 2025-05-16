import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { 
  createGroup, 
  getGroups, 
  sendGroupMessage, 
  getGroupMessages, 
  assignRole, 
  getGroupActivityLog,
  updateGroupName,
  addGroupMember,
  removeGroupMember,
  deleteGroup,
  addMessageReaction
} from "../controllers/group.controller.js";

const router = express.Router();

router.post("/", protectRoute, (req, res, next) => {
  const { name, memberIds } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: "Group name is required" });
  }
  if (!Array.isArray(memberIds)) {
    return res.status(400).json({ message: "Members must be an array" });
  }
  next();
}, createGroup);

router.get("/", protectRoute, getGroups);
router.post("/:groupId/messages", protectRoute, sendGroupMessage);
router.get("/:groupId/messages", protectRoute, getGroupMessages);
router.put("/:groupId/roles", protectRoute, assignRole);
router.get("/:groupId/activity-log", protectRoute, getGroupActivityLog);

// New routes for group management
router.put("/:groupId/name", protectRoute, updateGroupName);
router.post("/:groupId/members", protectRoute, addGroupMember);
router.delete("/:groupId/members", protectRoute, removeGroupMember);
router.delete("/:groupId", protectRoute, deleteGroup);

router.post("/:groupId/messages/:messageId/reactions", protectRoute, addMessageReaction);

export default router;