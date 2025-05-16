import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      required: true,
      enum: ['Food', 'Transportation', 'Accommodation', 'Activities', 'Shopping', 'Other']
    },
    description: {
      type: String,
    },
    date: {
      type: Date,
      required: true
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: function() {
        return this.type === 'group';
      }
    },
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: false // Ensure trip is optional
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    type: {
      type: String,
      enum: ['personal', 'group'],
      required: true,
      default: 'personal'
    },
    isGroupExpense: {
      type: Boolean,
      default: false
    },
    // New status field
    status: {
      type: String,
      enum: ['pending', 'paid', 'cancelled'],
      default: 'pending'
    },
    // Only for group expenses
    sharedWith: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      amount: {
        type: Number,
        min: 0
      },
      status: {
        type: String,
        enum: ['pending', 'paid'],
        default: 'pending'
      }
    }],
    // For receipt or bill images
    attachments: [{
      url: String,
      type: String
    }]
  },
  { timestamps: true }
);

// Middleware to validate shared amounts
expenseSchema.pre('save', function(next) {
  if (this.type === 'group' && this.sharedWith && this.sharedWith.length > 0) {
    const totalShared = this.sharedWith.reduce((sum, share) => sum + (share.amount || 0), 0);
    if (totalShared > this.amount) {
      next(new Error('Total shared amount cannot exceed the expense amount'));
    }
  }
  next();
});

// Method to check if a user has access to this expense
expenseSchema.methods.isAccessibleBy = function(userId) {
  return (
    this.createdBy.toString() === userId.toString() ||
    (this.type === 'group' && this.sharedWith.some(share => 
      share.user.toString() === userId.toString()
    ))
  );
};

const Expense = mongoose.model("Expense", expenseSchema);

export default Expense;
