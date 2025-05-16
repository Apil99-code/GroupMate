import { format } from 'date-fns';
import { getExpenseCategory } from '../constants/expenseCategories';
import { Receipt, User, Calendar, DollarSign, MessageSquare } from 'lucide-react';

const ExpenseCard = ({ expense, onView }) => {
  const category = getExpenseCategory(expense.category);
  const CategoryIcon = category.icon;

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div 
      className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
      onClick={() => onView(expense)}
    >
      <div className="card-body">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${category.color} bg-opacity-10`}>
              <CategoryIcon className={`w-6 h-6 ${category.color}`} />
            </div>
            <div>
              <h3 className="font-medium">{expense.title}</h3>
              <p className="text-sm text-base-content/70">{category.label}</p>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-lg font-semibold">${expense.amount}</span>
            <div className={`badge ${getStatusColor(expense.status)} badge-sm text-white`}>
              {expense.status || 'Pending'}
            </div>
          </div>
        </div>

        <div className="divider my-2"></div>

        <div className="flex flex-wrap gap-3 text-sm text-base-content/70">
          <div className="flex items-center gap-1">
            <User className="w-4 h-4" />
            <span>{expense.paidBy?.username || 'Unknown'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{format(new Date(expense.date), 'MMM d, yyyy')}</span>
          </div>
          {expense.splitBetween?.length > 0 && (
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              <span>Split between {expense.splitBetween.length} people</span>
            </div>
          )}
          {expense.notes && (
            <div className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              <span>Has notes</span>
            </div>
          )}
        </div>

        {expense.receipt && (
          <div className="mt-3">
            <img 
              src={expense.receipt} 
              alt="Receipt" 
              className="w-full h-32 object-cover rounded-lg"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseCard; 