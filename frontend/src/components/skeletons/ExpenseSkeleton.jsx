import { PlusCircle } from "lucide-react";

const ExpenseSkeleton = () => {
  // Create 2 skeleton items to simulate loading expenses
  const skeletonExpenses = Array(2).fill(null);

  return (
    <div
      className="bg-base-100 rounded-lg shadow-cl p-6 w-full max-w-sm animate-pulse"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-6 w-32 bg-base-300 rounded" />
        <PlusCircle className="h-5 w-5 text-base-300" />
      </div>

      {/* Total Expenses */}
      <div className="h-10 w-40 bg-base-300 rounded mb-8" />

      {/* Skeleton Expense Items */}
      {skeletonExpenses.map((_, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between p-4 rounded-lg bg-base-200 mb-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-base-300 rounded-full" />
            <div>
              <div className="h-4 w-24 bg-base-300 rounded mb-2" />
              <div className="h-3 w-16 bg-base-300 rounded" />
            </div>
          </div>

          <div className="h-4 w-16 bg-base-300 rounded" />
        </div>
      ))}

      {/* View All Button */}
      <div className="h-10 w-full bg-base-300 rounded" />
    </div>
  );
};

export default ExpenseSkeleton;
