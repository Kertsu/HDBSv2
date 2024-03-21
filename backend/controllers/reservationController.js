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
    return res.status(400).json({
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
    return res.status(400).json({ success: false, error: "Invalid request" });
  }

  if (action == "approve") {
    reservation.status = "APPROVED";
    await reservation.save();
    //   @TODO
    // Send email
    //   sendReservationApproved(
    //     user.email,
    //     user.name,
    //     updatedReservation.deskNumber
    //   );

    return res.status(200).json({
      success: true,
      reservation,
    });
  } else if (action == "reject") {
    await reservation.deleteOne();
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

    return res.status(200).json({
      success: true,
      reservation,
    });
  } else {
    return res.status(400).json({
      success: false,
      error: "Invalid action",
    });
  }
});

const abortReservation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const reservation = await Reservation.findById(id);

  if (!reservation) {
    return res
      .status(400)
      .json({ success: false, error: "Reservation not found" });
  }

  if (reservation.status !== "PENDING" || reservation.mode === 1) {
    // @TODO
    // await ReservationHistory.create({
    //   reservation: reservation.id,
    //   deskNumber: reservation.deskNumber,
    //   user: reservation.user,
    //   date: reservation.date,
    //   startTime: reservation.startTime,
    //   endTime: reservation.endTime,
    //   type: "ABORTED",
    //   mode: reservation.mode,
    // });
    await reservation.deleteOne();
    res
      .status(200)
      .json({ success: true, message: `Reservation aborted`, reservation });
  } else {
    res.status(400).json({ success: false, error: "Invalid request" });
  }
});

const getSelfReservations = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const reservations = await queryHelper(Reservation, req.query, 'reservations');

    const filteredReservations =  reservations.filter(reservation => {
        return reservation.user.toString() === userId && reservation.mode === 0})

    res.status(200).json({
        success: true,
        reservations: filteredReservations
    });
});

const cancelReservation = asyncHandler(async (req, res) => {
    const reservation = await Reservation.findOne({
        user: req.user.id,
        _id: req.params.id,
      });
    
      if (!reservation) {
        return res.status(400).json({ success:false, error: "Reservation not found" });
      }
    
      if (reservation && reservation.status !== "STARTED") {
        // await ReservationHistory.create({
        //   mode: reservation.mode,
        //   reservation: reservation.id,
        //   deskNumber: reservation.deskNumber,
        //   user: req.user.id,
        //   date: reservation.date,
        //   startTime: reservation.startTime,
        //   endTime: reservation.endTime,
        //   type: "CANCELED",
        // });
        await reservation.deleteOne();
        return res.status(200).json({success: true, message: `Reservation canceled`, reservation });
      } else {
        return res
          .status(400)
          .json({ success:false, error: "Invalid request. Reservation cannot be canceled." });
      }
})


module.exports = { getReservations, handleReservation, abortReservation, getSelfReservations, cancelReservation };
