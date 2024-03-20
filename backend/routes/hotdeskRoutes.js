const { getHotdesks, createHotdesk } = require("../controllers/hotdeskController");
const { protect, isAdmin, canHandleReservation } = require("../middlewares/authMiddleware");
const router = require("express").Router();


router.get('/', canHandleReservation, getHotdesks)

router.post('/', canHandleReservation, createHotdesk)

module.exports = router