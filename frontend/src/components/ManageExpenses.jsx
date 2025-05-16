import { useState, useEffect } from 'react';
import { useExpenseStore } from '../store/useExpenseStore';
import { useGroupStore } from '../store/useGroupStore';
import { useTripStore } from "../store/useTripStore";
import { Plus, Pencil, Trash2, Receipt, Users, User } from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from "axios";

const ManageExpenses = () => {
  // Configure axios inline
  const axiosInstance = axios.create({
    baseURL: "http://localhost:5000/api", // Ensure this matches your backend server URL
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Add a request interceptor to include the token in headers
  axiosInstance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  const { expenses, getExpenses, addExpense, updateExpense, deleteExpense, isExpensesLoading } = useExpenseStore();
  const { selectedGroup } = useGroupStore();
  const { trips } = useTripStore(); // Fetch trips for the dropdown
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    sharedWith: [],
    tripId: ''
  });

  useEffect(() => {
    if (selectedGroup?._id) {
      console.log('Fetching expenses for group:', selectedGroup._id); // Debug log
      getExpenses(selectedGroup._id).catch((error) => {
        console.error('Error fetching expenses:', error.message); // Log API errors
      });
    }
  }, [selectedGroup?._id, getExpenses]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.amount || !formData.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const expenseData = {
        ...formData,
        amount: parseFloat(formData.amount),
        groupId: selectedGroup._id,
        date: formData.date || new Date().toISOString(),
      };

      if (editingExpense) {
        await updateExpense(editingExpense._id, expenseData);
        toast.success("Expense updated successfully");
      } else {
        await addExpense(expenseData);
        if (formData.tripId) {
          toast.success("Expense added and shared in the trip chat!");
          // Share expense details in the chat group
          await axiosInstance.post(`/chat/${formData.tripId}/message`, {
            text: `New expense added: ${formData.title} - $${formData.amount}`,
          });
        } else {
          toast.success("Expense added successfully");
        }
      }
      
      // Refresh the expenses list
      await getExpenses(selectedGroup._id);
      
      setIsModalOpen(false);
      setEditingExpense(null);
      setFormData({
        title: "",
        amount: "",
        category: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
        sharedWith: [],
        tripId: ''
      });
    } catch (error) {
      console.error('Error saving expense:', error.message); // Log errors
      toast.error(error.message || "Failed to save expense");
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormData({
      title: expense.title,
      amount: expense.amount,
      category: expense.category,
      description: expense.description || '',
      date: new Date(expense.date).toISOString().split('T')[0],
      sharedWith: expense.sharedWith || [],
      tripId: expense.tripId || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (expenseId) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await deleteExpense(expenseId);
        // Refresh the expenses list
        await getExpenses(selectedGroup._id);
        toast.success('Expense deleted successfully');
      } catch (error) {
        console.error('Error deleting expense:', error.message); // Log errors
        toast.error(error.message || 'Failed to delete expense');
      }
    }
  };

  const categories = [
    'Accommodation',
    'Food',
    'Transport',
    'Activities',
    'Shopping',
    'Other'
  ];

  if (isExpensesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!selectedGroup?._id) {
    return <div>Please select a group to view expenses.</div>; // Handle missing group
  }

  return (
    <div className="container mx-auto px-4 py-8 mt-16">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Expenses</h1>
        <button
          onClick={() => {
            setEditingExpense(null);
            setFormData({
              title: '',
              amount: '',
              category: '',
              description: '',
              date: new Date().toISOString().split('T')[0],
              sharedWith: [],
              tripId: ''
            });
            setIsModalOpen(true);
          }}
          className="btn btn-primary gap-2"
        >
          <Plus className="size-4" />
          Add Expense
        </button>
      </div>

      <div className="grid gap-4">
        {expenses.map((expense) => (
          <div key={expense._id} className="card bg-base-200 shadow-sm">
            <div className="card-body">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium">{expense.title}</h3>
                  <p className="text-sm text-base-content/70">{expense.category}</p>
                  {expense.description && (
                    <p className="text-sm mt-2">{expense.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Users className="size-4" />
                    <span className="text-sm">
                      {expense.groupId?.name || 'Unknown Group'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="text-lg font-semibold">${expense.amount.toFixed(2)}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(expense)}
                      className="btn btn-ghost btn-xs"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(expense._id)}
                      className="btn btn-ghost btn-xs"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-base-100 p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingExpense ? 'Edit Expense' : 'Add New Expense'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">
                  <span className="label-text">Title</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input input-bordered w-full"
                  required
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Amount</span>
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="input input-bordered w-full"
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Category</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="select select-bordered w-full"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Description</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="textarea textarea-bordered w-full"
                  placeholder="Add a description..."
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Date</span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="input input-bordered w-full"
                  required
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Trip</span>
                </label>
                <select
                  value={formData.tripId}
                  onChange={(e) => setFormData({ ...formData, tripId: e.target.value })}
                  className="select select-bordered w-full"
                >
                  <option value="">Select a trip</option>
                  {trips.map((trip) => (
                    <option key={trip._id} value={trip._id}>
                      {trip.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingExpense ? 'Update' : 'Add'} Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageExpenses;