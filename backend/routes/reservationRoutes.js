const { getReservations, handleReservation, abortReservation, getSelfReservations } = require("../controllers/reservationController");
const { protect, isAdmin, canHandleReservation, } = require("../middlewares/authMiddleware");
const router = require("express").Router();

router.get('/', canHandleReservation, getReservations)

router.patch('/:id/action/:action', canHandleReservation, handleReservation)

router.delete('/abort/:id', canHandleReservation, abortReservation)

router.get('/self', protect, getSelfReservations)

module.exports = router