import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  text: {
    type: String,
    required: function () {
      return !this.image; // text is required only if image is not present
    }
  },
  image: {
    type: String, // This should be a URL or path to the uploaded image
    required: function () {
      return !this.text; // image is required only if text is not present
    }
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: ['text', 'image', 'expense', 'trip_update'],
    default: 'text'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed // For storing extra data like expense/trip info
  }
}, { timestamps: true });


const activityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  action: {
    type: String,
    required: true
  },
  details: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
    },
    isGeneralGroup: {
      type: Boolean,
      default: false
    },
    messages: [messageSchema],
    totalExpenses: {
      type: Number,
      default: 0
    },
    lastActivity: {
      type: Date,
      default: Date.now
    },
    activityLog: [activityLogSchema]
  },
  { timestamps: true }
);

const Group = mongoose.model("Group", groupSchema);

export default Group;