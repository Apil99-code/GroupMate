import { useState, useEffect } from 'react';
import { useExpenseStore } from '../store/useExpenseStore';
import { useGroupStore } from '../store/useGroupStore';
import { useAuthStore } from '../store/useAuthStore';
import { useTripStore } from '../store/useTripStore';
import { Receipt, Users, User, Plane, Calendar, CreditCard, Tag, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import ExpenseFilters from '../components/ExpenseFilters';
import ExpenseSummary from '../components/ExpenseSummary';

const ExpensePage = () => {
  const { expenses, getExpenses, addExpense, deleteExpense, updateExpenseStatus, isExpensesLoading } = useExpenseStore();
  const { selectedGroup, groups, getGroups } = useGroupStore();
  const { authUser } = useAuthStore();
  const { trips, getTrips } = useTripStore();
  const [activeTab, setActiveTab] = useState('personal');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    dateRange: { start: '', end: '' },
    amountRange: { min: '', max: '' }
  });
  
  const [newExpense, setNewExpense] = useState({
    title: '',
    amount: '',
    category: 'Other',
    description: '',
    date: new Date().toISOString().split('T')[0],
    expenseType: 'personal',
    tripId: '',
    groupId: selectedGroup?._id || ''
  });

  useEffect(() => {
    console.log('ExpensePage mounted, authUser:', authUser);
    if (authUser?._id) {
      console.log('Fetching data...');
      Promise.all([
        getExpenses(),
        getTrips(authUser._id),
        getGroups()
      ]).then(() => {
        console.log('All data fetched successfully');
      }).catch(error => {
        console.error('Error fetching data:', error);
      });
    }
  }, [authUser?._id, getExpenses, getTrips, getGroups]);

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!newExpense.title || !newExpense.amount || !newExpense.category || !newExpense.date) {
      toast.error('Title, amount, category, and date are required');
      return;
    }

    // Validate group selection for group expenses
    if (newExpense.expenseType === 'group' && !newExpense.groupId) {
      toast.error('You need to select a group for group expenses');
      return;
    }

    try {
      const expenseData = {
        title: newExpense.title,
        amount: parseFloat(newExpense.amount),
        category: newExpense.category,
        date: newExpense.date,
        description: newExpense.description || '',
        userId: authUser._id,
        groupId: newExpense.expenseType === 'group' ? newExpense.groupId : null,
        tripId: newExpense.tripId || null,
        type: newExpense.expenseType,
        isGroupExpense: newExpense.expenseType === 'group'
      };

      console.log('Submitting expense data:', expenseData);

      await addExpense(expenseData);
      toast.success('Expense added successfully');
      
      // Reset form
      setShowAddExpense(false);
      setNewExpense({
        title: '',
        amount: '',
        category: 'Other',
        description: '',
        date: new Date().toISOString().split('T')[0],
        expenseType: 'personal',
        tripId: '',
        groupId: ''
      });

      // Refresh expenses list
      if (authUser?._id) {
        getExpenses();
      }
    } catch (error) {
      console.error('Failed to add expense:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to add expense';
      toast.error(errorMessage);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await deleteExpense(id);
    } catch (error) {
      console.error('Failed to delete expense:', error);
    }
  };

  // New handler for updating status
  const handleStatusUpdate = async (id, status) => {
    if (!window.confirm(`Are you sure you want to mark this expense as ${status}?`)) return;
    try {
      await updateExpenseStatus(id, status);
      // Re-fetch expenses to ensure the list is up-to-date
      await getExpenses(); 
      // toast.success(`Expense marked as ${status}`); // Toast is already shown in the store action
    } catch (error) {
      console.error(`Failed to mark expense as ${status}:`, error);
      // Error toast is already shown in the store action
    }
  };

  const filteredExpenses = expenses?.filter(expense => {
    // First filter by tab (personal/group)
    const tabFilter = activeTab === 'personal' 
      ? expense.type === 'personal' && expense.user?._id?.toString() === authUser?._id?.toString()
      : expense.type === 'group';

    if (!tabFilter) return false;

    // Then apply additional filters
    const categoryMatch = !filters.category || expense.category === filters.category;
    const statusMatch = !filters.status || expense.status === filters.status;
    
    const dateMatch = (!filters.dateRange.start || new Date(expense.date) >= new Date(filters.dateRange.start)) &&
                     (!filters.dateRange.end || new Date(expense.date) <= new Date(filters.dateRange.end));
    
    const amountMatch = (!filters.amountRange.min || expense.amount >= Number(filters.amountRange.min)) &&
                       (!filters.amountRange.max || expense.amount <= Number(filters.amountRange.max));

    return categoryMatch && statusMatch && dateMatch && amountMatch;
  });

  // Filter trips to only show planning trips in the dropdown
  const planningTrips = trips?.filter(trip => trip.status === 'planning');

  console.log('Render - All expenses:', expenses);
  console.log('Render - Filtered expenses:', filteredExpenses);
  console.log('Render - Active tab:', activeTab);
  console.log('Render - Auth user:', authUser);

  const renderExpenseTable = () => {
    if (!filteredExpenses || filteredExpenses.length === 0) {
      return (
        <div className="text-center text-gray-500 py-8">
          No {activeTab} expenses found. Add one to get started!
        </div>
      );
    }

    return (
      <div className="overflow-x-auto bg-base-100 rounded-lg shadow-xl">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Date</th>
              <th>Title</th>
              <th>Category</th>
              <th>Amount</th>
              {activeTab === 'group' && <th>Group</th>}
              {activeTab === 'personal' && <th>Trip</th>}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.map((expense) => (
              <tr key={expense._id} className="hover">
                <td className="whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {new Date(expense.date).toLocaleDateString()}
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4" />
                    <div>
                      <div className="font-bold">{expense.title}</div>
                      {expense.description && (
                        <div className="text-sm opacity-50">{expense.description}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    <span className="badge badge-ghost">{expense.category}</span>
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    <span className="font-semibold">${expense.amount.toFixed(2)}</span>
                  </div>
                </td>
                {activeTab === 'group' && (
                  <td>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>{expense.group?.name || 'N/A'}</span>
                    </div>
                  </td>
                )}
                {activeTab === 'personal' && (
                  <td>
                    <div className="flex items-center gap-2">
                      <Plane className="w-4 h-4" />
                      <span>{expense.trip?.title || 'N/A'}</span>
                    </div>
                  </td>
                )}
                <td>
                  <div className="flex items-center gap-2">
                    {expense.status === 'paid' ? (
                      <span className="badge badge-success gap-1 text-white">
                        <CheckCircle className="w-4 h-4" /> Paid
                      </span>
                    ) : expense.status === 'cancelled' ? (
                      <span className="badge badge-error gap-1 text-white">
                        <XCircle className="w-4 h-4" /> Cancelled
                      </span>
                    ) : ( // Status is 'pending'
                      <>
                        <button
                          onClick={() => handleStatusUpdate(expense._id, 'paid')}
                          className="btn btn-ghost btn-sm text-success"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" /> Paid
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(expense._id, 'cancelled')}
                          className="btn btn-ghost btn-sm text-warning"
                        >
                          <XCircle className="w-4 h-4 mr-1" /> Cancel
                        </button>
                      </>
                    )}
                    {/* Delete button for all expenses */}
                    <button
                      onClick={async () => {
                        await handleDelete(expense._id);
                        if (authUser?._id) getExpenses();
                      }}
                      className="btn btn-ghost btn-sm text-error"
                      title="Delete Expense"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={activeTab === 'group' ? 6 : 5}>
                <div className="flex justify-between items-center p-4">
                  <div className="text-sm text-gray-500">
                    Total {activeTab} expenses:
                  </div>
                  <div className="text-xl font-bold">
                    ${filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}
                  </div>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  if (isExpensesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 mt-16">
      <ExpenseSummary expenses={filteredExpenses} />
      
      <div className="flex justify-between items-center mb-6 mt-8">
        <div className="tabs tabs-boxed">
          <button
            className={`tab gap-2 ${activeTab === 'personal' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('personal')}
          >
            <User className="w-4 h-4" />
            My Expenses
          </button>
          <button
            className={`tab gap-2 ${activeTab === 'group' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('group')}
          >
            <Users className="w-4 h-4" />
            Group Expenses
          </button>
        </div>
        <button
          onClick={() => setShowAddExpense(true)}
          className="btn btn-primary gap-2"
        >
          <Receipt className="w-4 h-4" />
          Add Expense
        </button>
      </div>

      <div className="mb-6">
        <ExpenseFilters
          filters={filters}
          onFilter={handleFiltersChange}
        />
      </div>

      {showAddExpense && (
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title">Add New Expense</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Expense Type</span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`btn flex-1 ${newExpense.expenseType === 'personal' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setNewExpense({ ...newExpense, expenseType: 'personal', groupId: '' })}
                  >
                    <User className="w-4 h-4 mr-2" />
                    Personal
                  </button>
                  <button
                    type="button"
                    className={`btn flex-1 ${newExpense.expenseType === 'group' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setNewExpense({ ...newExpense, expenseType: 'group' })}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Group
                  </button>
                </div>
              </div>

              {newExpense.expenseType === 'group' && (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Select Group</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={newExpense.groupId}
                    onChange={(e) => setNewExpense({ ...newExpense, groupId: e.target.value })}
                    required={newExpense.expenseType === 'group'}
                  >
                    <option value="">Select a group</option>
                    {groups?.map((group) => (
                      <option key={group._id} value={group._id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Title</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={newExpense.title}
                  onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })}
                  placeholder="Expense title"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Amount</span>
                </label>
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
                <label className="label">
                  <span className="label-text">Category</span>
                </label>
                <select
                  className="select select-bordered"
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                >
                  <option value="Food">Food</option>
                  <option value="Transportation">Transportation</option>
                  <option value="Accommodation">Accommodation</option>
                  <option value="Activities">Activities</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Date</span>
                </label>
                <input
                  type="date"
                  className="input input-bordered"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Associate with Trip (Optional)</span>
                </label>
                <select
                  className="select select-bordered"
                  value={newExpense.tripId}
                  onChange={(e) => setNewExpense({ ...newExpense, tripId: e.target.value })}
                >
                  <option value="">No trip association</option>
                  {planningTrips?.map((trip) => (
                    <option key={trip._id} value={trip._id}>
                      {trip.title} (Planning)
                    </option>
                  ))}
                </select>
                {trips?.length > 0 && planningTrips?.length === 0 && (
                  <label className="label">
                    <span className="label-text-alt text-warning">Only trips in planning status can have expenses added</span>
                  </label>
                )}
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Description</span>
                </label>
                <textarea
                  className="textarea textarea-bordered"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  placeholder="Add a description..."
                />
              </div>

              <div className="card-actions justify-end">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddExpense(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {renderExpenseTable()}
    </div>
  );
};

export default ExpensePage; 