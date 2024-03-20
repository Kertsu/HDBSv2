const { getHotdesks } = require("../controllers/hotdeskController");
const { protect, isAdmin, canHandleReservation } = require("../middlewares/authMiddleware");
const router = require("express").Router();


router.get('/', canHandleReservation, getHotdesks)

module.exports = router