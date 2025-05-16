import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useExpenseStore } from '../store/useExpenseStore';
import { DollarSign, Users, User, Plus, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate } from '../utils/formatters';

const TripExpenses = ({ trip }) => {
  const { authUser } = useAuthStore();
  const { addExpense, deleteExpense } = useExpenseStore();
  const [activeTab, setActiveTab] = useState('group'); // 'group' or 'personal'
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({
    title: '',
    amount: '',
    category: 'Other',
    description: '',
    date: new Date().toISOString().split('T')[0],
    type: 'group'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newExpense.title || !newExpense.amount) {
      toast.error('Title and amount are required');
      return;
    }

    try {
      const expenseData = {
        ...newExpense,
        tripId: trip._id,
        createdBy: authUser._id,
        type: activeTab,
        amount: parseFloat(newExpense.amount)
      };

      await addExpense(expenseData);
      setShowAddExpense(false);
      setNewExpense({
        title: '',
        amount: '',
        category: 'Other',
        description: '',
        date: new Date().toISOString().split('T')[0],
        type: activeTab
      });
      toast.success('Expense added successfully');
    } catch (error) {
      toast.error('Failed to add expense');
    }
  };

  const handleDelete = async (expenseId) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await deleteExpense(expenseId);
      toast.success('Expense deleted successfully');
    } catch (error) {
      toast.error('Failed to delete expense');
    }
  };

  const getExpenses = () => {
    if (activeTab === 'group') {
      return trip.groupExpenses || [];
    }
    const userExpenses = trip.personalExpenses?.find(
      pe => pe.userId.toString() === authUser._id.toString()
    );
    return userExpenses?.expenses || [];
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="tabs tabs-boxed">
          <button
            className={`tab gap-2 ${activeTab === 'group' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('group')}
          >
            <Users className="w-4 h-4" />
            Group Expenses
          </button>
          <button
            className={`tab gap-2 ${activeTab === 'personal' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('personal')}
          >
            <User className="w-4 h-4" />
            Personal Expenses
          </button>
        </div>
        <button
          onClick={() => setShowAddExpense(true)}
          className="btn btn-primary btn-sm gap-2"
        >
          <Plus className="w-4 h-4" />
          Add {activeTab === 'group' ? 'Group' : 'Personal'} Expense
        </button>
      </div>

      {/* Expenses List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {getExpenses().map((expense) => (
          <div key={expense._id} className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="card-title">{expense.title}</h3>
                  <p className="text-sm text-gray-500">{expense.category}</p>
                </div>
                {expense.createdBy === authUser._id && (
                  <button
                    onClick={() => handleDelete(expense._id)}
                    className="btn btn-ghost btn-sm"
                  >
                    Delete
                  </button>
                )}
              </div>
              <p className="text-2xl font-bold">{formatCurrency(expense.amount)}</p>
              {expense.description && (
                <p className="text-sm text-gray-600">{expense.description}</p>
              )}
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>{formatDate(expense.date)}</span>
                <span className="flex items-center gap-1">
                  <Receipt className="w-4 h-4" />
                  {expense.attachments?.length || 0} attachments
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">
              Add New {activeTab === 'group' ? 'Group' : 'Personal'} Expense
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="form-control">
                <label className="label">Title</label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={newExpense.title}
                  onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })}
                  placeholder="Expense title"
                />
              </div>
              <div className="form-control">
                <label className="label">Amount</label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="form-control">
                <label className="label">Category</label>
                <select
                  className="select select-bordered"
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                >
                  <option value="Food">Food</option>
                  <option value="Transportation">Transportation</option>
                  <option value="Accommodation">Accommodation</option>
                  <option value="Activities">Activities</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-control">
                <label className="label">Description</label>
                <textarea
                  className="textarea textarea-bordered"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  placeholder="Add a description..."
                />
              </div>
              <div className="form-control">
                <label className="label">Date</label>
                <input
                  type="date"
                  className="input input-bordered"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                />
              </div>
              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowAddExpense(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Expense
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={() => setShowAddExpense(false)}></div>
        </div>
      )}
    </div>
  );
};

export default TripExpenses; 