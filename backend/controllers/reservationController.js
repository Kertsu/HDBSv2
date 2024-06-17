const asyncHandler = require("express-async-handler");
const Reservation = require("../models/reservationModel");
const User = require("../models/userModel");
const Hotdesk = require("../models/hotdeskModel");
const UserReview = require("../models/userReviewModel");
const ReservationHistory = require("../models/reservationHistoryModel");
const Switch = require("../models/switchModel");
const queryHelper = require("../utils/queryHelper");
const ActionType = require("../utils/trails.enum");
const { createAuditTrail } = require("../utils/helpers");
const {
  sendReservationApproved,
  sendSuccessfulReservation,
  sendReservationRejected,
  sendReservationAborted,
} = require("../utils/mail.util");

const dateOptions = {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
};

const getReservations = asyncHandler(async (req, res) => {
  const reservations = await queryHelper(Reservation, req.query, "reservation");
  res.status(200).json({
    success: true,
    reservations,
    totalDocuments: await Reservation.countDocuments({ mode: req.query.mode }),
  });
});

const handleReservation = asyncHandler(async (req, res) => {
  const { id, action } = req.params;

  const actionType = ActionType.RESERVATION_MANAGEMENT;
  const actionDetails = `handle reservation`;
  let error;

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
    error = "Invalid request";
    createAuditTrail(req, {
      actionType,
      actionDetails,
      status: "failed",
      additionalContext: error,
    });
    return res.status(400).json({ success: false, error });
  }

  if (action == "approve") {
    reservation.status = "APPROVED";
    await reservation.save();

    if (user.receivingEmail) {
      sendReservationApproved({ deskNumber: reservation.deskNumber, user }, req, res);
    }
    createAuditTrail(req, {
      actionType,
      actionDetails,
      status: "success",
      additionalContext: `Reservation has been approved by ${req.user.username}`,
    });

    return res.status(200).json({
      success: true,
      reservation,
    });
  } else if (action == "reject") {
    await reservation.deleteOne();
    if (user.receivingEmail) {
      sendReservationRejected({ deskNumber: reservation.deskNumber, user }, req, res);
    }
    await ReservationHistory.create({
      reservation: reservation.id,
      user: reservation.user,
      deskNumber: reservation.deskNumber,
      date: reservation.date,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      type: "REJECTED",
      mode: reservation.mode,
    });
    createAuditTrail(req, {
      actionType,
      actionDetails,
      status: "success",
      additionalContext: `Reservation has been rejected by ${req.user.username}`,
    });
    return res.status(200).json({
      success: true,
      reservation,
    });
  } else {
    error = "Invalid action";
    createAuditTrail(req, {
      actionType,
      actionDetails,
      status: "failed",
      additionalContext: error,
    });
    return res.status(400).json({
      success: false,
      error,
    });
  }
});

const abortReservation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const reservation = await Reservation.findById(id);

  const actionType = ActionType.RESERVATION_MANAGEMENT;
  const actionDetails = `abort reservation`;
  let error;

  const user = await User.findById(reservation.user);

  if (!reservation) {
    return res
      .status(400)
      .json({ success: false, error: "Reservation not found" });
  }

  if (reservation.status !== "PENDING" || reservation.mode === 1) {
    await ReservationHistory.create({
      reservation: reservation.id,
      deskNumber: reservation.deskNumber,
      user: reservation.user,
      date: reservation.date,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      type: "ABORTED",
      mode: reservation.mode,
    });
    await reservation.deleteOne();
    if (user.receivingEmail) {
      sendReservationAborted({ deskNumber: reservation.deskNumber, user }, req, res);
    }
    createAuditTrail(req, {
      actionType,
      actionDetails,
      status: "success",
      additionalContext: `Reservation has been aborted by ${req.user.username}`,
    });
    return res
      .status(200)
      .json({ success: true, message: `Reservation aborted`, reservation });
  } else {
    error = "Invalid request";
    createAuditTrail(req, {
      actionType,
      actionDetails,
      status: "failed",
      additionalContext: error,
    });
    return res.status(400).json({ success: false, error });
  }
});

const getSelfReservations = asyncHandler(async (req, res) => {
  req.query.id = req.user.id;

  const reservations = await queryHelper(
    Reservation,
    req.query,
    "reservations"
  );

  res.status(200).json({
    success: true,
    reservations,
    totalDocuments: await Reservation.countDocuments({
      user: req.user.id,
      mode: 0,
    }),
  });
});

const cancelReservation = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findOne({
    user: req.user.id,
    _id: req.params.id,
  });

  const actionType = ActionType.RESERVATION_MANAGEMENT;
  const actionDetails = `cancel reservation`;
  let error;

  if (!reservation) {
    return res
      .status(400)
      .json({ success: false, error: "Reservation not found" });
  }

  if (reservation && reservation.status !== "STARTED") {
    await ReservationHistory.create({
      mode: reservation.mode,
      reservation: reservation.id,
      deskNumber: reservation.deskNumber,
      user: req.user.id,
      date: reservation.date,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      type: "CANCELED",
    });
    await reservation.deleteOne();

    const formattedDate = new Date(reservation.date).toLocaleDateString(
      undefined,
      dateOptions
    );

    createAuditTrail(req, {
      actionType,
      actionDetails,
      status: "success",
      additionalContext: `Canceled their reservation on Hotdesk #${reservation.deskNumber} on ${formattedDate}`,
    });
    return res
      .status(200)
      .json({ success: true, message: `Reservation canceled`, reservation });
  } else {
    error = "Invalid request. Reservation cannot be canceled.";
    createAuditTrail(req, {
      actionType,
      actionDetails,
      status: "failed",
      additionalContext: error,
    });
    return res.status(400).json({
      success: false,
      error,
    });
  }
});

const reserve = asyncHandler(async (req, res) => {
  const { date, startTime, endTime, deskNumber, mode } = req.body;
  const desks = Array.from({ length: 80 }, (_, index) => index + 1);
  const desk = await Hotdesk.findOne({ deskNumber });

  const actionType = ActionType.RESERVATION;
  const actionDetails = `reserve desk`;
  let error;

  const currentDate = new Date();
  const selectedDate = new Date(date);

  if (!date || !startTime || !endTime || !deskNumber || isNaN(selectedDate)) {
    return res.status(400).json({
      success: false,
      error: "Missing required data.",
    });
  }

  const minDate = new Date();
  const twoWeeksFromToday = new Date();
  twoWeeksFromToday.setDate(currentDate.getDate() + 16);
  minDate.setDate(currentDate.getDate() + 2);

  const minDateReset = new Date(
    minDate.toISOString().split("T")[0] + "T00:00:00.000Z"
  );

  if (
    (selectedDate < minDateReset || selectedDate > twoWeeksFromToday) &&
    mode !== 1
  ) {
    error = "Invalid date range";
    createAuditTrail(req, {
      actionType,
      actionDetails,
      status: "failed",
      additionalContext: error,
    });
    return res.status(400).json({
      success: false,
      error,
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
    createAuditTrail(req, {
      actionType,
      actionDetails,
      status: "failed",
      additionalContext: "Already have a reservation for this date",
    });
    return res.status(400).json({
      success: false,
      error: "You already have a reservation for this date.",
    });
  } else if (reservedHotdesk || desk.status === "UNAVAILABLE") {
    error = "Hotdesk is unavailable";
    createAuditTrail(req, {
      actionType,
      actionDetails,
      status: "failed",
      additionalContext: error,
    });
    return res.status(400).json({ success: false, error });
  } else {
    if (!desks.includes(deskNumber)) {
      return res
        .status(400)
        .json({ success: false, error: "Hotdesk not found" });
    } else {
      try {
        const switchConfig = await Switch.findOne();

        const status = switchConfig.autoAccepting ? "APPROVED" : "PENDING";

        const newReservation = await Reservation.create({
          user: req.user.id,
          deskNumber,
          date,
          startTime,
          endTime,
          mode,
          status,
        });

        if (switchConfig.autoAccepting && req.user.receivingEmail) {
          sendReservationApproved({ deskNumber, user: req.user }, req, res);
        }

        if (req.user.receivingEmail && !switchConfig.autoAccepting) {
          sendSuccessfulReservation({ newReservation, user: req.user }, req, res);
        }

        const formattedDate = new Date(date).toLocaleDateString(
          undefined,
          dateOptions
        );
        createAuditTrail(req, {
          actionType,
          actionDetails,
          status: "success",
          additionalContext: `Reserved for Hotdesk #${deskNumber} on ${formattedDate}`,
        });
        return res.status(201).json({ success: true, newReservation });
      } catch (error) {
        return res
          .status(400)
          .json({ success: false, error: "Failed to create a reservation." });
      }
    }
  }
});

const getHistory = asyncHandler(async (req, res) => {
  
  const reservations = await queryHelper(
    ReservationHistory,
    req.query,
    "history"
  );

  return res.status(200).json({
    success: true,
    reservations: reservations,
    totalDocuments: await ReservationHistory.countDocuments({ mode: req.query.mode }),
  });
});

const getSelfHistory = asyncHandler(async (req, res) => {
  req.query.id = req.user.id;
  const reservations = await queryHelper(
    ReservationHistory,
    req.query,
    "selfHistory"
  );

  return res.status(200).json({
    success: true,
    reservations,
    totalDocuments: await ReservationHistory.countDocuments({
      user: req.user.id,
      mode: 0,
    }),
  });
});

const getSelfToRateReservations = asyncHandler(async (req, res) => {
  req.query.id = req.user.id;

  const toRateReservations = await queryHelper(
    UserReview,
    req.query,
    "userReview"
  );

  return res.status(200).json({
    success: true,
    toRateReservations,
    totalDocuments: await UserReview.countDocuments({
      user: req.user.id,
      mode: 0,
      status: "PENDING",
    }),
  });
});

module.exports = {
  getReservations,
  handleReservation,
  abortReservation,
  getSelfReservations,
  cancelReservation,
  reserve,
  getHistory,
  getSelfHistory,
  getSelfToRateReservations,
};
