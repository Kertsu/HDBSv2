const mongoose = require("mongoose");

const userSchema = mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
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
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
