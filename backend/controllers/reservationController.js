const asyncHandler = require("express-async-handler");
const Reservation = require("../models/reservationModel");
const User = require("../models/userModel");
const Hotdesk = require("../models/hotdeskModel");
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

  const reservations = await queryHelper(
    Reservation,
    req.query,
    "reservations"
  );

  const filteredReservations = reservations.filter((reservation) => {
    return reservation.user.toString() === userId && reservation.mode === 0;
  });

  res.status(200).json({
    success: true,
    reservations: filteredReservations,
  });
});

const cancelReservation = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findOne({
    user: req.user.id,
    _id: req.params.id,
  });

  if (!reservation) {
    return res
      .status(400)
      .json({ success: false, error: "Reservation not found" });
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
    return res
      .status(200)
      .json({ success: true, message: `Reservation canceled`, reservation });
  } else {
    return res.status(400).json({
      success: false,
      error: "Invalid request. Reservation cannot be canceled.",
    });
  }
});

const reserve = asyncHandler(async (req, res) => {
  const { date, startTime, endTime, deskNumber, mode } = req.body;
  const desks = Array.from({ length: 80 }, (_, index) => index + 1);
  const desk = await Hotdesk.findOne({ deskNumber });

  const currentDate = new Date();
  const selectedDate = new Date(date);

  console.log("currentDate", currentDate);
  console.log("selectedDate", selectedDate);

  if (!date || !startTime || !endTime || !deskNumber || isNaN(selectedDate)) {
    return res.status(400).json({
      success: false,
      error: "Missing required data.",
    });
  }

  const twoWeeksFromToday = new Date();
  twoWeeksFromToday.setDate(currentDate.getDate() + 14);

  if (
    (selectedDate <= currentDate || selectedDate > twoWeeksFromToday) &&
    mode !== 1
  ) {
    return res.status(400).json({
      success: false,
      error:
        "Invalid date range. Please select a date not earlier than today and not greater than a 2-week span.",
    });
  }

  const existingReservation = await Reservation.findOne({
    user: req.user.id,
    date,
    mode: 0,
  });
  const reservedHotdesk = await Reservation.findOne({
    deskNumber,
    date,
    status: { $in: ["PENDING", "APPROVED", "STARTED"] },
  });

  if (existingReservation) {
    return res.status(400).json({
      success: false,
      error: "You already have a reservation for this date.",
    });
  } else if (reservedHotdesk || desk.status === "UNAVAILABLE") {
    return res
      .status(400)
      .json({ success: false, error: "Hotdesk is unavailable" });
  } else {
    if (!desks.includes(deskNumber)) {
      return res
        .status(400)
        .json({ success: false, error: "Hotdesk not found" });
    } else {
      try {
        //   const switchConfig = await Switch.findOne()

        //   const status = switchConfig.autoAccepting ? "APPROVED" : "PENDING";

        const newReservation = await Reservation.create({
          user: req.user.id,
          deskNumber,
          date,
          startTime,
          endTime,
          mode,
          status: "PENDING",
        });

        //   if (switchConfig.autoAccepting){
        //     sendReservationApproved(req.user.email, req.user.name, deskNumber)
        //   }

        return res.status(201).json({ success: true, newReservation });
      } catch (error) {
        return res
          .status(400)
          .json({ success: false, error: "Failed to create a reservation." });
      }
    }
  }
});

module.exports = {
  getReservations,
  handleReservation,
  abortReservation,
  getSelfReservations,
  cancelReservation,
  reserve,
};
