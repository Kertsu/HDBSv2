const mongoose = require("mongoose");

const deskNumberSchema = mongoose.Schema(
  {
    number: {
      type: Number,
      required: true,
      unique: true,
      enum: Array.from({ length: 80 }, (_, index) => index + 1),
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DeskNumber", deskNumberSchema);