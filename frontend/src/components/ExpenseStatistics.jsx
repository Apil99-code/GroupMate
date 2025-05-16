import { useState, useEffect } from 'react';
import { useExpenseStore } from '../store/useExpenseStore';
import { useGroupStore } from '../store/useGroupStore';
import ExpenseChart from './charts/ExpenseChart';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const ExpenseStatistics = () => {
  const { expenses, getExpenses, isExpensesLoading } = useExpenseStore();
  const { selectedGroup } = useGroupStore();
  const [dateRange, setDateRange] = useState('monthly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [chartData, setChartData] = useState({
    categoryData: { 
      labels: [], 
      datasets: [{
        data: [],
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF'
        ],
        borderWidth: 1
      }]
    },
    monthlyData: { 
      labels: [], 
      datasets: [{
        label: 'Monthly Expenses',
        data: [],
        backgroundColor: '#36A2EB',
        borderColor: '#2993E2',
        borderWidth: 1
      }]
    },
    groupVsPersonalData: { 
      labels: ['Group Expenses', 'Personal Expenses'], 
      datasets: [{
        data: [0, 0],
        backgroundColor: ['#FF6384', '#36A2EB'],
        borderWidth: 1
      }]
    }
  });

  // Fetch expenses when group changes
  useEffect(() => {
    const fetchExpenses = async () => {
      if (selectedGroup?._id) {
        try {
          await getExpenses(selectedGroup._id);
        } catch (error) {
          console.error('Failed to fetch expenses:', error);
        }
      }
    };
    fetchExpenses();
  }, [selectedGroup?._id, getExpenses]);

  // Update chart data when expenses, dateRange, or selectedYear changes
  useEffect(() => {
    if (expenses && expenses.length > 0) {
      updateChartData();
    }
  }, [expenses, dateRange, selectedYear]);

  const filterExpensesByDateRange = (expenses) => {
    if (!expenses) return [];
    
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date || expense.createdAt);
      
      if (expenseDate.getFullYear() !== selectedYear) {
        return false;
      }

      if (dateRange === 'weekly') {
        const currentDate = new Date();
        const weekStart = startOfWeek(currentDate);
        const weekEnd = endOfWeek(currentDate);
        return isWithinInterval(expenseDate, { start: weekStart, end: weekEnd });
      }

      return true;
    });
  };

  const updateChartData = () => {
    const filteredExpenses = filterExpensesByDateRange(expenses);

    // Prepare category data
    const categoryTotals = filteredExpenses.reduce((acc, expense) => {
      const category = expense.category || 'Uncategorized';
      acc[category] = (acc[category] || 0) + (parseFloat(expense.amount) || 0);
      return acc;
    }, {});

    // Prepare monthly/weekly data
    const timeData = filteredExpenses.reduce((acc, expense) => {
      const date = new Date(expense.date || expense.createdAt);
      const key = dateRange === 'weekly' 
        ? format(date, 'EEE') // Day of week
        : format(date, 'MMMM'); // Month
      acc[key] = (acc[key] || 0) + (parseFloat(expense.amount) || 0);
      return acc;
    }, {});

    // Prepare group vs personal data
    const groupVsPersonal = filteredExpenses.reduce((acc, expense) => {
      const type = expense.groupId ? 'Group Expenses' : 'Personal Expenses';
      acc[type] = (acc[type] || 0) + (parseFloat(expense.amount) || 0);
      return acc;
    }, { 'Group Expenses': 0, 'Personal Expenses': 0 });

    setChartData({
      categoryData: {
        labels: Object.keys(categoryTotals),
        datasets: [{
          data: Object.values(categoryTotals),
          backgroundColor: [
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0',
            '#9966FF'
          ],
          borderWidth: 1
        }]
      },
      monthlyData: {
        labels: Object.keys(timeData),
        datasets: [{
          label: `${dateRange === 'weekly' ? 'Weekly' : 'Monthly'} Expenses`,
          data: Object.values(timeData),
          backgroundColor: '#36A2EB',
          borderColor: '#2993E2',
          borderWidth: 1
        }]
      },
      groupVsPersonalData: {
        labels: Object.keys(groupVsPersonal),
        datasets: [{
          data: Object.values(groupVsPersonal),
          backgroundColor: ['#FF6384', '#36A2EB'],
          borderWidth: 1
        }]
      }
    });
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          color: '#666'
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => `$${context.raw.toFixed(2)}`
        }
      }
    }
  };

  if (isExpensesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalExpenses = expenses?.reduce((total, expense) => 
    total + (parseFloat(expense.amount) || 0), 0
  ) || 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-4">Expense Statistics</h1>
        <div className="stats shadow mb-6">
          <div className="stat">
            <div className="stat-title">Total Expenses</div>
            <div className="stat-value text-primary">${totalExpenses.toFixed(2)}</div>
            <div className="stat-desc">{dateRange} overview</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 mb-6">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="select select-bordered"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="select select-bordered"
          >
            {Array.from({ length: 5 }, (_, i) => (
              <option key={i} value={new Date().getFullYear() - i}>
                {new Date().getFullYear() - i}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Category Distribution */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Expense Categories</h2>
            <div className="h-[300px]">
              <ExpenseChart
                type="pie"
                data={chartData.categoryData}
                options={chartOptions}
              />
            </div>
          </div>
        </div>

        {/* Group vs Personal */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Group vs Personal Expenses</h2>
            <div className="h-[300px]">
              <ExpenseChart
                type="pie"
                data={chartData.groupVsPersonalData}
                options={chartOptions}
              />
            </div>
          </div>
        </div>

        {/* Time-based Trends */}
        <div className="card bg-base-100 shadow-xl md:col-span-2">
          <div className="card-body">
            <h2 className="card-title">
              {dateRange === 'weekly' ? 'Weekly' : 'Monthly'} Expense Trends
            </h2>
            <div className="h-[400px]">
              <ExpenseChart
                type="bar"
                data={chartData.monthlyData}
                options={chartOptions}
              />
            </div>
          </div>
        </div>
      </div>

      {(!expenses || expenses.length === 0) && (
        <div className="text-center text-base-content/70 py-8 mt-4">
          No expenses found for the selected period.
        </div>
      )}
    </div>
  );
};

export default ExpenseStatistics; 