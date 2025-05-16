import { useState } from 'react';
import { EXPENSE_CATEGORIES } from '../constants/expenseCategories';
import { Filter, X } from 'lucide-react';

const ExpenseFilters = ({ onFilter }) => {
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    dateRange: {
      start: '',
      end: ''
    },
    minAmount: '',
    maxAmount: ''
  });

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilter(newFilters);
  };

  const clearFilters = () => {
    const resetFilters = {
      category: '',
      status: '',
      dateRange: {
        start: '',
        end: ''
      },
      minAmount: '',
      maxAmount: ''
    };
    setFilters(resetFilters);
    onFilter(resetFilters);
  };

  return (
    <div className="bg-base-200 p-4 rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5" />
          <h3 className="font-medium">Filters</h3>
        </div>
        {Object.values(filters).some(v => v !== '' && v?.start !== '' && v?.end !== '') && (
          <button
            onClick={clearFilters}
            className="btn btn-ghost btn-sm gap-2"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Category Filter */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Category</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
          >
            <option value="">All Categories</option>
            {EXPENSE_CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Status</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Date Range Filter */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Date Range</span>
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              className="input input-bordered w-full"
              value={filters.dateRange.start}
              onChange={(e) => handleFilterChange('dateRange', {
                ...filters.dateRange,
                start: e.target.value
              })}
            />
            <input
              type="date"
              className="input input-bordered w-full"
              value={filters.dateRange.end}
              onChange={(e) => handleFilterChange('dateRange', {
                ...filters.dateRange,
                end: e.target.value
              })}
            />
          </div>
        </div>

        {/* Amount Range Filter */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Amount Range</span>
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min"
              className="input input-bordered w-full"
              value={filters.minAmount}
              onChange={(e) => handleFilterChange('minAmount', e.target.value)}
            />
            <input
              type="number"
              placeholder="Max"
              className="input input-bordered w-full"
              value={filters.maxAmount}
              onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseFilters; 