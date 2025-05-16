import Expense from "../models/expense.model.js";
import Group from "../models/group.model.js";
import { Trip } from "../models/trip.model.js";
import { formatCurrency } from "../utils/formatters.js";
import Notification from '../models/Notification.js';
import { io } from '../lib/socket.js';

// Create a new expense
export const createExpense = async (req, res) => {
  try {
    const { 
      title, 
      amount, 
      category, 
      description, 
      date, 
      type,
      isGroupExpense,
      user,
      createdBy
    } = req.body;

    // Accept both group/groupId and trip/tripId
    const group = req.body.group || req.body.groupId;
    const trip = req.body.trip || req.body.tripId;

    // Validate required fields
    if (!title || !amount || !category || !date || !type || !user) {
      return res.status(400).json({
        message: "Title, amount, category, date, type, and user are required",
      });
    }

    // Validate amount
    if (amount <= 0) {
      return res.status(400).json({
        message: "Amount must be greater than 0",
      });
    }

    // For group expenses, validate group
    let groupDoc = null;
    if (type === 'group') {
      if (!group) {
        return res.status(400).json({
          message: "Group field is required for group expenses",
        });
      }

      // Check if group exists and user is a member
      groupDoc = await Group.findOne({
        _id: group,
        members: user
      });

      if (!groupDoc) {
        return res.status(404).json({
          message: "Group not found or you're not a member",
        });
      }
    }

    // Validate tripId if provided
    if (trip) {
      const tripDoc = await Trip.findById(trip);
      if (!tripDoc) {
        return res.status(404).json({ message: "Trip not found" });
      }
    }

    // Create the expense
    const newExpense = new Expense({
      title,
      amount,
      category,
      description,
      date: new Date(date),
      group: type === 'group' ? group : null,
      trip: trip || null,
      type,
      isGroupExpense,
      user,
      createdBy: createdBy || user,
      sharedWith: type === 'group' ? [] : undefined
    });

    await newExpense.save();

    // If it's a group expense, update the group's total expenses
    if (type === 'group' && group) {
      await Group.findByIdAndUpdate(group, {
        $inc: { totalExpenses: amount },
        $set: { lastActivity: new Date() }
      });

      // Add expense message to group chat
      await Group.findByIdAndUpdate(group, {
        $push: {
          messages: {
            text: `New expense added: ${title} - $${amount}`,
            sender: user,
            type: 'expense',
            metadata: {
              expenseId: newExpense._id,
              amount,
              category
            }
          }
        }
      });

      // Notify all group members except the creator
      if (groupDoc) {
        for (const memberId of groupDoc.members) {
          if (memberId.toString() !== user.toString()) {
            const notification = await Notification.create({
              user: memberId,
              type: 'expense',
              title: 'New Group Expense',
              message: `A new expense "${title}" was added to group "${groupDoc.name}".`
            });
            io.to(memberId.toString()).emit('notification', notification);
          }
        }
      }
    } else {
      // Personal expense: notify the user
      const notification = await Notification.create({
        user: user,
        type: 'expense',
        title: 'Expense Added',
        message: `You added a new expense "${title}".`
      });
      io.to(user.toString()).emit('notification', notification);
    }

    // Populate the expense with related data
    const populatedExpense = await Expense.findById(newExpense._id)
      .populate('user', 'username profilePic')
      .populate('createdBy', 'username profilePic')
      .populate('group', 'name')
      .populate('trip', 'title')
      .populate('sharedWith.user', 'username profilePic');

    res.status(201).json(populatedExpense);
  } catch (error) {
    console.error("Error in createExpense:", error);
    res.status(500).json({ 
      message: "Failed to create expense", 
      error: error.message 
    });
  }
};

// Get all expenses for a user
export const getExpenses = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.query;

    // Build query based on user's access
    let query = {
      $or: [
        { user: userId }, // User's own expenses
        { "sharedWith.user": userId } // Expenses shared with user
      ]
    };

    if (groupId) {
      query.group = groupId;
    }

    const expenses = await Expense.find(query)
      .populate("user", "username profilePic")
      .populate("group", "name")
      .populate("sharedWith.user", "username profilePic")
      .sort({ date: -1 });

    res.status(200).json(expenses);
  } catch (error) {
    console.error("Error in getExpenses:", error.message);
    res.status(500).json({ 
      message: "Internal Server Error",
      error: error.message 
    });
  }
};

// Get a specific expense by ID
export const getExpenseById = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate("userId", "username profilePic")
      .populate("groupId", "name")
      .populate("sharedWith.userId", "username profilePic");

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    // Check if user is the expense creator or a group member
    const isCreator = expense.userId.toString() === req.user._id.toString();
    const isGroupMember = expense.sharedWith.some(
      share => share.userId._id.toString() === req.user._id.toString()
    );

    if (!isCreator && !isGroupMember) {
      return res.status(403).json({ 
        message: "Not authorized to view this expense" 
      });
    }

    res.status(200).json(expense);
  } catch (error) {
    console.error("Error in getExpenseById:", error.message);
    res.status(500).json({ 
      message: "Internal Server Error",
      error: error.message 
    });
  }
};

// Update an existing expense
export const updateExpense = async (req, res) => {
  try {
    const { title, amount, category, date, description, sharedWith } = req.body;
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    // Check if user is the expense creator
    if (expense.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: "Not authorized to update this expense" 
      });
    }

    // Validate amount if provided
    if (amount && amount <= 0) {
      return res.status(400).json({ 
        message: "Amount must be greater than 0" 
      });
    }

    // Validate sharedWith amounts if provided
    if (sharedWith && sharedWith.length > 0) {
      const totalSharedAmount = sharedWith.reduce((sum, share) => sum + share.amount, 0);
      if (totalSharedAmount > (amount || expense.amount)) {
        return res.status(400).json({ 
          message: "Total shared amount cannot exceed the expense amount" 
        });
      }
    }

    // Update fields
    expense.title = title || expense.title;
    expense.amount = amount || expense.amount;
    expense.category = category || expense.category;
    expense.date = date || expense.date;
    expense.description = description || expense.description;
    if (sharedWith) {
      expense.sharedWith = sharedWith;
    }

    await expense.save();

    // Populate the updated expense
    const updatedExpense = await Expense.findById(expense._id)
      .populate("userId", "username profilePic")
      .populate("groupId", "name")
      .populate("sharedWith.userId", "username profilePic");

    res.status(200).json({ 
      message: "Expense updated successfully", 
      expense: updatedExpense 
    });
  } catch (error) {
    console.error("Error in updateExpense:", error.message);
    res.status(500).json({ 
      message: "Internal Server Error",
      error: error.message 
    });
  }
};

// Delete an expense
export const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    // Check if user is the expense creator
    if (expense.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: "Not authorized to delete this expense" 
      });
    }

    await expense.deleteOne();

    res.status(200).json({ message: "Expense deleted successfully" });
  } catch (error) {
    console.error("Error in deleteExpense:", error.message);
    res.status(500).json({ 
      message: "Internal Server Error",
      error: error.message 
    });
  }
};

// Update Expense Status
export const updateExpenseStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    // Basic validation: Check if user is the expense owner
    // You might need more complex logic depending on your group/sharing rules
    if (expense.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Not authorized to update this expense's status"
      });
    }

    // Validate the status
    const validStatuses = ['paid', 'cancelled', 'pending']; // Add 'pending' if you want to revert
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status provided" });
    }

    // Update the status
    expense.status = status;
    await expense.save();

    // Populate the updated expense to return useful data if needed
    const updatedExpense = await Expense.findById(expense._id)
      .populate('user', 'username profilePic') // Populate fields as needed
      .populate('group', 'name');

    res.status(200).json({ 
      message: `Expense status updated to ${status}`,
      expense: updatedExpense // Send back the updated expense
    });

  } catch (error) {
    console.error("Error in updateExpenseStatus:", error.message);
    res.status(500).json({ 
      message: "Internal Server Error",
      error: error.message 
    });
  }
};

// Split an expense
export const splitExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { sharedWith } = req.body;

    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    const totalSharedAmount = sharedWith.reduce((sum, share) => sum + share.amount, 0);
    if (totalSharedAmount > expense.amount) {
      return res.status(400).json({ message: "Shared amount exceeds total expense" });
    }

    expense.sharedWith = sharedWith;
    await expense.save();

    res.status(200).json(expense);
  } catch (error) {
    res.status(500).json({ message: "Failed to split expense", error: error.message });
  }
};

// Get group expenses
export const getGroupExpenses = async (req, res) => {
  try {
    const { groupId } = req.params;
    
    if (!groupId) {
      return res.status(400).json({ message: "Group ID is required" });
    }

    // Find all expenses for this group where type is "group"
    const expenses = await Expense.find({
      group: groupId,
      type: 'group'
    })
    .populate('createdBy', 'username profilePic') // Populate user who created the expense
    .populate('trip', 'title startDate endDate') // Populate trip details if associated
    .sort({ createdAt: -1 }); // Sort by newest first

    res.status(200).json(expenses);
  } catch (error) {
    console.error("Error in getGroupExpenses:", error);
    res.status(500).json({ 
      message: "Failed to fetch group expenses",
      error: error.message 
    });
  }
};
