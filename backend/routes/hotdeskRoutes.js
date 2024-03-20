const { getHotdesks, createHotdesk, deleteHotdesk } = require("../controllers/hotdeskController");
const { protect, isAdmin, canHandleReservation } = require("../middlewares/authMiddleware");
const router = require("express").Router();


router.get('/', canHandleReservation, getHotdesks)

router.post('/', canHandleReservation, createHotdesk)

router.delete('/:id', canHandleReservation, deleteHotdesk)

module.exports = router