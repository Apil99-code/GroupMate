import mongoose from "mongoose";

const tripSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    destination: { type: String, required: true },
    budget: { type: Number, required: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    chatGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: false,
    },
    expenses: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expense",
    }],
    status: {
      type: String,
      enum: ["planning", "upcoming", "ongoing", "completed"],
      default: "planning",
    },
    location: { type: String, required: true },
    coordinates: { type: [Number], required: true },
    image: { type: String },
    activities: [{ type: String }],
    accommodation: { type: String },
    transportation: { type: String },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    sharedWith: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    sharedGroups: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
    }],
    isPublic: { type: Boolean, default: false },
    tripMembers: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      role: {
        type: String,
        enum: ["admin", "member"],
        default: "member"
      }
    }],
    groupExpenses: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expense"
    }],
    personalExpenses: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      expenses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Expense"
      }]
    }],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Virtual for total group expenses
tripSchema.virtual('totalGroupExpenses').get(function() {
  if (!this.groupExpenses) return 0;
  return this.groupExpenses.reduce((total, expense) => total + (expense.amount || 0), 0);
});

// Virtual for total personal expenses per user
tripSchema.virtual('totalPersonalExpenses').get(function() {
  if (!this.personalExpenses) return 0;
  return this.personalExpenses.reduce((total, userExpenses) => {
    return total + userExpenses.expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  }, 0);
});

export const Trip = mongoose.model("Trip", tripSchema);
