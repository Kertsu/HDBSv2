const { getHotdesks, createHotdesk, deleteHotdesk, updateHotdesk, submitReport } = require("../controllers/hotdeskController");
const { protect, canHandleReservation } = require("../middlewares/authMiddleware");
const router = require("express").Router();


router.get('/', protect, getHotdesks)

router.post('/', canHandleReservation, createHotdesk)

router.delete('/:id', canHandleReservation, deleteHotdesk)

router.put('/:id', canHandleReservation, updateHotdesk )

router.post('/report', protect, submitReport)

module.exports = router