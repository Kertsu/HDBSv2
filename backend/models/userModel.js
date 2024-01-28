const mongoose = require("mongoose");

const userSchema = mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true
    },
    password: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true
    },
    resetToken: {
      type: String,
      expiresAt: Date,
    },
    avatar: {
      type: String,
    },
    isDisabled: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      default: "user",
      enum: ["user", "admin", "om", "superadmin"],
    },
    notifications: [
      {
        message: String,
        timestamp: { type: Date, default: Date.now },
        status: { type: String, enum : ['unread', 'read', 'archived'],  default: 'unread' } 
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
