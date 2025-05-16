export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

export const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(date));
};

export const formatDateTime = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
};

export const calculateTotalExpenses = (expenses) => {
  return expenses.reduce((total, expense) => total + expense.amount, 0);
};

export const groupExpensesByCategory = (expenses) => {
  return expenses.reduce((groups, expense) => {
    const category = expense.category || 'Other';
    if (!groups[category]) {
      groups[category] = 0;
    }
    groups[category] += expense.amount;
    return groups;
  }, {});
};

export const calculateExpenseShare = (expense, userId) => {
  if (!expense.sharedWith || expense.sharedWith.length === 0) {
    return expense.amount;
  }

  const userShare = expense.sharedWith.find(share => share.userId.toString() === userId.toString());
  return userShare ? userShare.amount : 0;
}; 