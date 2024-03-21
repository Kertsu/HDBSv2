const asyncHandler = require("express-async-handler");
const Reservation = require("../models/reservationModel");
const User = require("../models/userModel");
const queryHelper = require("../utils/queryHelper");

const getReservations = asyncHandler(async (req, res) => {
  const reservations = await queryHelper(Reservation, req.query, "reservation");
  res.status(200).json({
    success: true,
    reservations,
  });
});

const handleReservation = asyncHandler(async (req, res) => {
  const { id, action } = req.params;

  const reservation = await Reservation.findById(id);
  if (!reservation) {
    res.status(400).json({
      success: false,
      error: "Reservation not found",
    });
  }
  const user = await User.findById(reservation.user);
  if (!user) {
    return res.status(400).json({
      success: false,
      error: "User not found for the reservation",
    });
  }

  if (reservation.status != "PENDING") {
    res.status(400).json({ success: false, error: "Invalid request" });
  }

  if (action == "approve") {
    const updatedReservation = await Reservation.findByIdAndUpdate(
      id,
      { status: "APPROVED" },
      { new: true }
    );
    //   @TODO
    // Send email
    //   sendReservationApproved(
    //     user.email,
    //     user.name,
    //     updatedReservation.deskNumber
    //   );

    res.status(200).json({
      success: true,
      updatedReservation,
    });
  } else if (action == "reject") {
    const rejectedReservation = await Reservation.findByIdAndDelete(id);

    //  @TODO
    //   await ReservationHistory.create({
    //     reservation: rejectedReservation.id,
    //     user: rejectedReservation.user,
    //     deskNumber: rejectedReservation.deskNumber,
    //     date: rejectedReservation.date,
    //     startTime: rejectedReservation.startTime,
    //     endTime: rejectedReservation.endTime,
    //     type: "REJECTED",
    //     mode: rejectedReservation.mode
    //   });

    res.status(200).json({
      success: true,
      rejectedReservation,
    });
  } else {
    res.status(400).json({
      success: false,
      error: "Invalid action",
    });
  }
});

module.exports = { getReservations, handleReservation };
