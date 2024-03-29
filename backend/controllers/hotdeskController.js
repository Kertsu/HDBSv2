const Hotdesk = require("../models/hotdeskModel");
const asyncHandler = require("express-async-handler");
const queryHelper = require("../utils/queryHelper");
const DeskNumber = require("../models/deskNumberModel");
const Reservation = require('../models/reservationModel')

const getHotdesks = asyncHandler(async (req, res) => {
  try {
    const desks = await queryHelper(Hotdesk, req.query, "hotdesk");

    res.status(200).json({
      success: true,
      desks,
      totalDocuments: await Hotdesk.countDocuments(),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

const createHotdesk = asyncHandler(async (req, res) => {
  const { deskNumber, essentials } = req.body;
  if (!deskNumber) {
    res.status(400).json({
      success: false,
      error: "Desk number is required.",
    });
  }

  const existingDesk = await Hotdesk.findOne({ deskNumber });

  if (!(deskNumber >= 1 && deskNumber <= 80)) {
    res.status(400).json({ message: "Invalid desk number" });
  } else {
    if (existingDesk) {
      res.status(400).json({ message: "Desk already exist" });
    } else {
      await DeskNumber.create({
        number: deskNumber,
      });

      const hotdesk = await Hotdesk.create({
        title: `Hotdesk ${deskNumber}`,
        deskNumber,
        workspaceEssentials: essentials,
      });

      res.status(201).json({
        success: true,
        hotdesk,
      });
    }
  }
});

const deleteHotdesk = asyncHandler(async (req, res) => {
  const hotdesk = await Hotdesk.findById(req.params.id);

  if (!hotdesk) {
    res.status(400).json({
      success: false,
      error: "Hotdesk not found",
    });
  }

  await DeskNumber.findOneAndDelete({ number: hotdesk.deskNumber });
  const deletedDesk = await Hotdesk.findByIdAndDelete(req.params.id);

  res.status(200).json({ success: true, desk: deletedDesk });
});

const updateHotdesk = asyncHandler(async (req, res) => {
  const hotdesk = await Hotdesk.findById(req.params.id);
  const { essentials, status } = req.body;
  const currentDate = new Date();

  const reservedDesks = [];
  currentDate.setUTCHours(0, 0, 0, 0);

  const reservations = await Reservation.find({
    date: currentDate.toISOString(),
  });

  for (const reservation of reservations) {
    reservedDesks.push(reservation.deskNumber);
  }

  if (reservedDesks.includes(hotdesk.deskNumber)) {
    res.status(400).json({
      message:
        "The hotdesk cannot be updated. Please choose an available hotdesk or try again later.",
    });
  } else {
    hotdesk.workspaceEssentials =
      essentials == null ? hotdesk.workspaceEssentials : essentials;
    hotdesk.status = status ?? hotdesk.status;
    await hotdesk.save();
    res.status(200).json(hotdesk);
  }
});

module.exports = { getHotdesks, createHotdesk, deleteHotdesk, updateHotdesk };
