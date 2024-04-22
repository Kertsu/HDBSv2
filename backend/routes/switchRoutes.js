const express = require("express");
const { canHandleReservation } = require("../middlewares/authMiddleware");
const { handleSwitch, getSwitchState } = require("../controllers/switchController");
const router = express.Router();


router.put('/', canHandleReservation, handleSwitch)


router.get('/', canHandleReservation, getSwitchState)
module.exports = router