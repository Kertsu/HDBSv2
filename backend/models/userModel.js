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
    description: {
      type: String
    },
    receivingEmail: {
      type: Boolean,
      default: true
    },
    resetToken: {
      type: String,
      expiresAt: Date,
    },
    avatar: {
      type: String,
      default: "http://res.cloudinary.com/drlztlr1m/image/upload/v1706979188/oxbsppubd3rsabqwfxsr.jpg"
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
