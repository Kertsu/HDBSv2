const mongoose = require("mongoose");

const SwitchSchema = mongoose.Schema(
  {
    autoAccepting: {
      type: Boolean,
      required: true,
      default: false
    },
  },
);

module.exports = mongoose.model("Switch", SwitchSchema);