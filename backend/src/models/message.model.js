import mongoose from "mongoose";

const ReactionSchema = new mongoose.Schema({
  emoji: {
    type: String,
    required: true
  },
  userIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  count: {
    type: Number,
    default: 0
  }
});

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function() {
        return !this.groupId; // Required only for direct messages
      }
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: function() {
        return !this.receiverId; // Required only for group messages
      }
    },
    text: {
      type: String,
    },
    image: {
      type: String,
    },
    reactions: [ReactionSchema]
  },
  { timestamps: true }
);

// Add index for faster queries
messageSchema.index({ groupId: 1, createdAt: 1 });
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: 1 });

// Method to add a reaction
messageSchema.methods.addReaction = async function(emoji, userId) {
  const reaction = this.reactions.find(r => r.emoji === emoji);
  
  if (reaction) {
    // If user already reacted, remove their reaction
    if (reaction.userIds.includes(userId)) {
      reaction.userIds = reaction.userIds.filter(id => id.toString() !== userId.toString());
      reaction.count = Math.max(0, reaction.count - 1);
      
      // Remove the reaction if no users left
      if (reaction.count === 0) {
        this.reactions = this.reactions.filter(r => r.emoji !== emoji);
      }
    } else {
      // Add new user reaction
      reaction.userIds.push(userId);
      reaction.count += 1;
    }
  } else {
    // Create new reaction
    this.reactions.push({
      emoji,
      userIds: [userId],
      count: 1
    });
  }
  
  return this.save();
};

// Method to get all reactions for a message
messageSchema.methods.getReactions = function() {
  return this.reactions.map(reaction => ({
    emoji: reaction.emoji,
    count: reaction.count,
    userIds: reaction.userIds
  }));
};

// Method to check if a user has reacted with a specific emoji
messageSchema.methods.hasUserReacted = function(userId, emoji) {
  const reaction = this.reactions.find(r => r.emoji === emoji);
  return reaction ? reaction.userIds.includes(userId) : false;
};

const Message = mongoose.model("Message", messageSchema);

export default Message;
