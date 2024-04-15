const mongoose = require('mongoose')

const hotdeskSchema = mongoose.Schema({
  title: {
    type: String,
    required: true,
    unique:true
  },
  deskNumber: {
    type: Number,
    required: true,
    unique: true
  },
  workspaceEssentials: {
    type: [String],
    enum: [
      "Desk Organizer",
      "Noise-Canceling Headphones",
      "Desk Plants",
      "Personalized Nameplate",
      "Cubicle Mirror",
      "Footrest",
      "Desk Lamp",
      "Bulletin Board",
      "Mini Fridge",
      "Task Lighting",
      "Whiteboard",
      "Under-Desk Storage",
      "Cubicle Shelf",
      "Cubicle Privacy Screen",
      "Ergonomic Chair Cushion",
    ],
  },
  status:{
    type: String, 
    enum:["AVAILABLE","UNAVAILABLE"],
    default: "AVAILABLE"
  },
  area: {
    type: Number
  }
}, { timestamps: true });

module.exports = mongoose.model('Hotdesk', hotdeskSchema);