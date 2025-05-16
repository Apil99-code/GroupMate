import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    profilePic: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "",
    },
    preferredDestinations: {
      type: String,
      default: "",
    },
    travelStyle: {
      type: String,
      enum: ["budget", "comfort", "luxury", ""],
      default: "",
    },
    language: {
      type: String,
      default: "English",
    },
    currency: {
      type: String,
      default: "USD",
    },
    theme: {
      type: String,
      default: "light",
    },
    layout: {
      type: String,
      default: "default",
    },
    notifications: {
      tripUpdates: {
        type: Boolean,
        default: true,
      },
      messages: {
        type: Boolean,
        default: true,
      },
      expenses: {
        type: Boolean,
        default: true,
      },
      location: {
        type: Boolean,
        default: true,
      },
    },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
