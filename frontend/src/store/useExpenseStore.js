// store/useExpenseStore.js
import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";

export const useExpenseStore = create((set, get) => ({
  expenses: [],
  selectedExpense: null,
  isExpensesLoading: false,
  isExpenseSubmitting: false,
  error: null,

  // Get expenses with optional group ID filter
  getExpenses: async (groupId = null) => {
    set({ isExpensesLoading: true });
    try {
      const res = await axiosInstance.get("/expense");
      console.log('Fetched expenses:', res.data, 'groupId:', groupId); // Debug log
      
      // If groupId is provided, filter expenses for that group
      const filteredExpenses = groupId 
        ? res.data.filter(expense => 
            expense.group === groupId && 
            expense.type === 'group' &&
            expense.isGroupExpense === true
          )
        : res.data;

      set({ 
        expenses: filteredExpenses,
        isExpensesLoading: false 
      });
      return filteredExpenses;
    } catch (error) {
      set({ isExpensesLoading: false });
      console.error("Error fetching expenses:", error);
      toast.error("Failed to fetch expenses");
      return [];
    }
  },

  // Add Expense
  addExpense: async (expenseData) => {
    set({ isExpenseSubmitting: true });
    try {
      // Ensure all required fields are present
      const requiredFields = ['title', 'amount', 'category', 'date', 'type', 'userId'];
      const missingFields = requiredFields.filter(field => !expenseData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Format the expense data according to the backend requirements
      const formattedExpenseData = {
        title: expenseData.title,
        amount: parseFloat(expenseData.amount),
        category: expenseData.category,
        description: expenseData.description || '',
        date: new Date(expenseData.date).toISOString(),
        type: expenseData.type,
        isGroupExpense: expenseData.type === 'group',
        group: expenseData.groupId || null,
        trip: expenseData.tripId || null,
        user: expenseData.userId, // Use userId as the user reference
        createdBy: expenseData.userId // Use the same userId for createdBy
      };

      const res = await axiosInstance.post("/expense", formattedExpenseData);
      
      // Update the expenses list with the new expense
      set((state) => ({ 
        expenses: [...state.expenses, res.data],
        isExpenseSubmitting: false 
      }));
      
      return res.data;
    } catch (error) {
      set({ isExpenseSubmitting: false });
      console.error("Error adding expense:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to add expense";
      toast.error(errorMessage);
      throw error;
    }
  },

  // Update expense
  updateExpense: async (expenseId, expenseData) => {
    try {
      const res = await axiosInstance.put(`/expense/${expenseId}`, expenseData);
      set((state) => ({
        expenses: state.expenses.map((expense) =>
          expense._id === expenseId ? res.data : expense
        ),
      }));
      return res.data;
    } catch (error) {
      console.error("Error updating expense:", error);
      toast.error("Failed to update expense");
      throw error;
    }
  },

  // Delete expense
  deleteExpense: async (expenseId) => {
    try {
      await axiosInstance.delete(`/expense/${expenseId}`);
      set((state) => ({
        expenses: state.expenses.filter((expense) => expense._id !== expenseId),
      }));
      toast.success("Expense deleted successfully");
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error("Failed to delete expense");
      throw error;
    }
  },

  // Update Expense Status
  updateExpenseStatus: async (expenseId, status) => {
    set({ isExpenseSubmitting: true });
    try {
      const res = await axiosInstance.put(`/expense/${expenseId}/status`, { status });
      set((state) => ({
        expenses: state.expenses.map((expense) =>
          expense._id === expenseId ? { ...expense, status: res.data.status } : expense
        ),
        isExpenseSubmitting: false,
      }));
      toast.success(`Expense marked as ${status}`);
      return res.data;
    } catch (error) {
      set({ isExpenseSubmitting: false });
      console.error(`Error updating expense status to ${status}:`, error);
      toast.error(`Failed to mark expense as ${status}`);
      throw error;
    }
  },

  // Split Expense
  splitExpense: async (expenseId, sharedWith) => {
    set({ isExpenseSubmitting: true });
    try {
      const res = await axiosInstance.put(`/expense/${expenseId}/split`, { sharedWith });
      set((state) => ({
        expenses: state.expenses.map((expense) =>
          expense._id === expenseId ? res.data : expense
        ),
      }));
      toast.success("Expense split successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to split expense");
    } finally {
      set({ isExpenseSubmitting: false });
    }
  },

  // Set Selected Expense
  setSelectedExpense: (expense) => set({ selectedExpense: expense }),

  // Clear Selected Expense
  clearSelectedExpense: () => set({ selectedExpense: null }),

  // Clear Errors
  clearError: () => set({ error: null })
}));
