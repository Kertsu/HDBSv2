const mongoose = require("mongoose");

const UserReviewSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    deskNumber: {
      type: Number,
      required: true,
    },
    reservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reservation",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["PENDING", "RATED", "ARCHIVED"],
      default: "PENDING",
    },
    mode: {
      type: Number,
      required: true,
      enum: [0, 1],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserReview", UserReviewSchema);
