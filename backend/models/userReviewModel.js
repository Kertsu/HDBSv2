const mongoose = require("mongoose");

const UserReviewSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    desk: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Desk",
      required: true,
    },
    reservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reservation",
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["PENDING", "COMPLETED", "ARCHIVED"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserReview", UserReviewSchema);
