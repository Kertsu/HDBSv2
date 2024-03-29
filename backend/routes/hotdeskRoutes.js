const { getHotdesks, createHotdesk, deleteHotdesk, updateHotdesk } = require("../controllers/hotdeskController");
const { protect, isAdmin, canHandleReservation } = require("../middlewares/authMiddleware");
const router = require("express").Router();


router.get('/', canHandleReservation, getHotdesks)

router.post('/', canHandleReservation, createHotdesk)

router.delete('/:id', canHandleReservation, deleteHotdesk)

router.put('/:id', canHandleReservation, updateHotdesk )

module.exports = router