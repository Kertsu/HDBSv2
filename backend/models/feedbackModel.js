const mongoose = require("mongoose");

const FeedbackSchema = mongoose.Schema(
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
    rating: {
      type: Number,
      min: 1,
      max: 5,
      enum: [1, 2, 3, 4, 5],
    },
    description: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Feedback", FeedbackSchema);
