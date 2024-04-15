const mongoose = require("mongoose");
const reservationHistorySchema = mongoose.Schema({
  reservation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Reservation",
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  deskNumber : {
    type: Number, 
    required: true
  },
  date: {
    type: Date,
    required: true,
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
  type: {
    type: String,
    enum: ["REJECTED", "CANCELED", "COMPLETED", "EXPIRED", "ABORTED"],
    required: true,
  },
  mode: {
    type: Number,
    required: true,
    enum : [0, 1],
    default: 0
  }
});

module.exports = mongoose.model("ReservationHistory", reservationHistorySchema);