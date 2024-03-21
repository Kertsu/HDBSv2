const asyncHandler = require('express-async-handler')
const Reservation = require('../models/reservationModel')
const queryHelper = require('../utils/queryHelper')

const getReservations = asyncHandler(async (req, res) => {
    const reservations = await queryHelper(Reservation, req.query, 'reservation')
    res.status(200).json(reservations);
})



module.exports = {getReservations}