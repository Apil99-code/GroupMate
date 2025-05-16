import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  searchUsers,
  sendFriendRequest,
  getFriends,
  getFriendRequests,
  acceptFriendRequest
} from "../controllers/friend.controller.js";

const router = express.Router();

router.get("/users/search", protectRoute, searchUsers);
router.post("/friends/request", protectRoute, sendFriendRequest);
router.get("/friends", protectRoute, getFriends);
router.get("/friends/requests", protectRoute, getFriendRequests);
router.post("/friends/accept", protectRoute, acceptFriendRequest);

export default router;