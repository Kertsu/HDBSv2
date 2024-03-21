const { getReservations, handleReservation } = require("../controllers/reservationController");
const { protect, isAdmin, canHandleReservation, } = require("../middlewares/authMiddleware");
const router = require("express").Router();

router.get('/', canHandleReservation, getReservations)

router.patch('/:id/action/:action', canHandleReservation, handleReservation)



module.exports = router