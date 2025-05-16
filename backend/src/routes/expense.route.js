import express from "express";
import {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  splitExpense,
  updateExpenseStatus,
  getGroupExpenses,
} from "../controllers/expense.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes are protected
router.use(protectRoute);

// Get expenses for a specific group
router.get("/group/:groupId", getGroupExpenses);

// Create a new expense
router.post("/", createExpense);

// Get all expenses for a user
router.get("/", getExpenses);

// Get a specific expense by ID
router.get("/:id", getExpenseById);

// Update an expense
router.put("/:id", updateExpense);

// Split an expense
router.put("/:id/split", splitExpense);

// Update expense status
router.put("/:id/status", updateExpenseStatus);

// Delete an expense
router.delete("/:id", deleteExpense);

export default router;
