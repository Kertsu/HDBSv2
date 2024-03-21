const { getReservations, handleReservation, abortReservation, getSelfReservations, cancelReservation, reserve, getHistory } = require("../controllers/reservationController");
const { protect, isAdmin, canHandleReservation, } = require("../middlewares/authMiddleware");
const router = require("express").Router();

router.get('/', canHandleReservation, getReservations)

router.patch('/:id/action/:action', canHandleReservation, handleReservation)

router.delete('/abort/:id', canHandleReservation, abortReservation)

router.get('/self', protect, getSelfReservations)

router.delete('/cancel/:id', protect, cancelReservation)

router.post('/reserve', protect, reserve)

router.get('/history', protect, getHistory)
/**
 * @todo
 * 
 * /self/history
 */

module.exports = router