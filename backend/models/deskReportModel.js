const mongoose = require("mongoose");

const DeskReportSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    desk: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotdesk",
      required: true,
    },
    date: {
      type: Date,
    },
    report: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["UNRESOLVED", "RESOLVED", "ARCHIVED"],
      default: "UNRESOLVED",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DeskReport", DeskReportSchema);
