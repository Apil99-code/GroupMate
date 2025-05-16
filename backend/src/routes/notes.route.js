import express from "express";
import {
  createNote,
  getUserNotes,
  updateNote,
  deleteNote,
} from "../controllers/notes.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(protectRoute);

// Create a new note
router.post("/", createNote);

// Get all notes for the logged-in user
router.get("/", getUserNotes);

// Update a note
router.put("/:id", updateNote);

// Delete a note
router.delete("/:id", deleteNote);

export default router;
