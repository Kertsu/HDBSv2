const { getReservations, handleReservation, abortReservation, getSelfReservations, cancelReservation, reserve, getHistory, getSelfHistory, getSelfToRateReservations } = require("../controllers/reservationController");
const { protect, isAdmin, canHandleReservation, } = require("../middlewares/authMiddleware");
const router = require("express").Router();

router.get('/', protect, getReservations)

router.patch('/:id/action/:action', canHandleReservation, handleReservation)

router.delete('/abort/:id', canHandleReservation, abortReservation)

router.get('/self', protect, getSelfReservations)

router.delete('/cancel/:id', protect, cancelReservation)

router.post('/reserve', protect, reserve)

router.get('/history', canHandleReservation, getHistory)

router.get('/self/history', protect, getSelfHistory )

router.get('/self/to-rate', protect, getSelfToRateReservations)

module.exports = router