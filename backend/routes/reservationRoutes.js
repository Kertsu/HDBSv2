const { getReservations } = require("../controllers/reservationController");
const { protect, isAdmin, canHandleReservation, } = require("../middlewares/authMiddleware");
const router = require("express").Router();

router.get('/', canHandleReservation, getReservations)

module.exports = router