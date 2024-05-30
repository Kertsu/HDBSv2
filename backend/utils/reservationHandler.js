const Reservation = require("../models/reservationModel");
const ReservationHistory = require("../models/reservationHistoryModel");
const UserReview = require("../models/userReviewModel");
const User = require("../models/userModel");
const cron = require("node-cron");

const roundToMillisecond = (date) => {
  const roundedDate = new Date(date);
  roundedDate.setMilliseconds(0);
  return roundedDate;
};

const changeToStartedJob = cron.schedule("* * * * *", async () => {
  const currentDate = new Date();
  const isoDate = currentDate.toISOString();
  const formattedDate = isoDate.split("T")[0];

  const reservations = await Reservation.find({
    status: "APPROVED",
    mode: 0,
    startTime: {
      $gte: `${formattedDate}T00:00:00.000Z`,
      $lt: `${formattedDate}T00:00:20.000Z`,
    },
  });

  // Change the status of the reservation to STARTED
  await Reservation.updateMany(
    {
      status: "APPROVED",
      startTime: {
        $gte: `${formattedDate}T00:00:00.000Z`,
        $lt: `${formattedDate}T00:00:20.000Z`,
      },
      mode: 0,
    },
    { status: "STARTED" }
  );
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

        await UserReview.create({
          user: reservation.user,
          deskNumber: reservation.deskNumber,
          reservation: reservation.id,
          mode: reservation.mode,
        });

        await User.findOneAndUpdate(
          { _id: reservation.user },
          { $inc: { toRate: 1 } }
        );

        const userId = reservation.user.toString();
        const user = getUser(userId);

        if (user) {
          io.to(user.socketId).emit("reservation-expired", {
            reservationId: reservation.id,
            userId: reservation.user,
            deskNumber: reservation.deskNumber,
            message: "Your reservation has ended.",
          });
        }
      }
    } catch (error) {
      console.log(error);
    }

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
