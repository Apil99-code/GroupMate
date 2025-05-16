import express from "express";
import {
  createTrip,
  getTrips,
  getTrip,
  updateTrip,
  deleteTrip,
  shareTrip,
  markTripAsCompleted,
  createTripFromChat,
  updateTripMembers,
  getTripExpenses,
  getGroupTrips
} from "../controllers/trip.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(protectRoute);

// Get trips for a specific group
router.get("/group/:groupId", getGroupTrips);

// Basic CRUD
router.post("/", createTrip);
router.get("/", getTrips);
router.get("/:id", getTrip);
router.put("/:id", updateTrip);
router.delete("/:id", deleteTrip);

// Trip status & actions
router.put("/:id/complete", markTripAsCompleted);
router.post("/:id/share", shareTrip);

// Trip collaboration & chat integration
router.post("/from-chat", createTripFromChat);
router.put("/:tripId/members", updateTripMembers);
router.get("/:tripId/expenses", getTripExpenses);

export default router;
