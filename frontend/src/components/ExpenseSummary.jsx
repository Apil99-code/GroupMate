import { ArrowUpRight, ArrowDownRight, DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react';

const SummaryCard = ({ title, value, icon: Icon, trend, trendValue }) => {
  const isPositive = trend === 'up';
  return (
    <div className="bg-base-100 p-4 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${isPositive ? 'bg-success/20' : 'bg-error/20'}`}>
            <Icon className={`w-5 h-5 ${isPositive ? 'text-success' : 'text-error'}`} />
          </div>
          <span className="text-sm text-base-content/70">{title}</span>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-success' : 'text-error'}`}>
            {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            <span>{trendValue}%</span>
          </div>
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
};

const ExpenseSummary = ({ expenses }) => {
  // Calculate summary statistics
  const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const paidExpenses = expenses.filter(exp => exp.status === 'paid');
  const pendingExpenses = expenses.filter(exp => exp.status === 'pending');
  const cancelledExpenses = expenses.filter(exp => exp.status === 'cancelled');

  const paidAmount = paidExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const pendingAmount = pendingExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Calculate month-over-month trend (mock values for now)
  const mockTrend = {
    total: { trend: 'up', value: 12 },
    paid: { trend: 'up', value: 8 },
    pending: { trend: 'down', value: 5 }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <SummaryCard
        title="Total Expenses"
        value={`$${totalAmount.toFixed(2)}`}
        icon={DollarSign}
        trend={mockTrend.total.trend}
        trendValue={mockTrend.total.value}
      />
      <SummaryCard
        title="Paid Expenses"
        value={`$${paidAmount.toFixed(2)}`}
        icon={CheckCircle}
        trend={mockTrend.paid.trend}
        trendValue={mockTrend.paid.value}
      />
      <SummaryCard
        title="Pending Expenses"
        value={`$${pendingAmount.toFixed(2)}`}
        icon={Clock}
        trend={mockTrend.pending.trend}
        trendValue={mockTrend.pending.value}
      />
      <SummaryCard
        title="Cancelled Expenses"
        value={cancelledExpenses.length}
        icon={XCircle}
      />
    </div>
  );
};

export default ExpenseSummary; 