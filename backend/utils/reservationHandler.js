const Reservation = require("../models/reservationModel");
const ReservationHistory = require("../models/reservationHistoryModel");
const UserReview = require("../models/userReviewModel");
const User = require("../models/userModel");
const cron = require("node-cron");
const { sendReservationStarted } = require("./mail.util");

const roundToMillisecond = (date) => {
  const roundedDate = new Date(date);
  roundedDate.setMilliseconds(0);
  return roundedDate;
};

const changeToStartedJob = cron.schedule("* * * * *", async () => {
  const currentDate = new Date();
  const isoDate = currentDate.toISOString();
  const formattedDate = isoDate.split("T")[0];

  const query = {
    status: "APPROVED",
    mode: 0,
    startTime: {
      $gte: `${formattedDate}T00:00:00.000Z`,
      $lt: `${formattedDate}T00:00:20.000Z`,
    },
  };

  const reservations = await Reservation.find(query).populate("user");

  if (reservations.length > 0) {
    for (const reservation of reservations) {
      const user = await User.findById(reservation.user._id);

      if (user.receivingEmail) {
        sendReservationStarted({ reservation });
      }
    }
  }

  await Reservation.updateMany(query, { status: "STARTED" });
});

const expiredReservationHandlerJob = (io, getUser) =>
  cron.schedule("* * * * *", async () => {
    const currentDate = new Date();

    const reservations = await Reservation.find({
      endTime: { $lte: roundToMillisecond(currentDate) },
    });

    try {
      for (const reservation of reservations) {
        await ReservationHistory.create({
          reservation: reservation.id,
          user: reservation.user,
          deskNumber: reservation.deskNumber,
          date: reservation.date,
          startTime: reservation.startTime,
          endTime: reservation.endTime,
          type: "COMPLETED",
          mode: reservation.mode,
        });

        const userReview = await UserReview.create({
          user: reservation.user,
          deskNumber: reservation.deskNumber,
          reservation: reservation.id,
          mode: reservation.mode,
          date: reservation.date,
        });

        await User.findOneAndUpdate(
          { _id: reservation.user },
          { $inc: { toRate: 1 } }
        );

        const userId = reservation.user.toString();
        const user = getUser(userId);

        if (user && userReview) {
          io.to(user.socketId).emit("reservation-expired", userReview);
        }
      }
    } catch (error) {}

    await Reservation.deleteMany({
      endTime: { $lte: roundToMillisecond(currentDate) },
    });
  });

const midnightReservationCleanupJob = cron.schedule("0 0 * * *", async () => {
  const currentDate = new Date();

  const reservations = await Reservation.find({
    status: "PENDING",
    date: { $lt: roundToMillisecond(currentDate) },
  });

  for (const reservation of reservations) {
    await ReservationHistory.create({
      reservation: reservation.id,
      user: reservation.user,
      deskNumber: reservation.deskNumber,
      date: reservation.date,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      type: "EXPIRED",
      mode: reservation.mode,
    });
  }

  await Reservation.deleteMany({
    status: "PENDING",
    date: { $lt: roundToMillisecond(currentDate) },
  });
});

const unapprovedReservationsCleanUpJob = cron.schedule(
  "* * * * *",
  async () => {
    const currentDate = new Date();

    const reservations = await Reservation.find({
      status: "PENDING",
      startTime: { $lt: roundToMillisecond(currentDate) },
    });

    for (const reservation of reservations) {
      await ReservationHistory.create({
        reservation: reservation.id,
        user: reservation.user,
        deskNumber: reservation.deskNumber,
        date: reservation.date,
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        type: "EXPIRED",
        mode: reservation.mode,
      });
    }

    await Reservation.deleteMany({
      status: "PENDING",
      startTime: { $lt: roundToMillisecond(currentDate) },
    });
  }
);

module.exports = {
  changeToStartedJob,
  expiredReservationHandlerJob,
  midnightReservationCleanupJob,
  unapprovedReservationsCleanUpJob,
};
