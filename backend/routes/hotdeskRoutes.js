const { getHotdesks, createHotdesk, deleteHotdesk, updateHotdesk, submitReport, getReports, handleReport } = require("../controllers/hotdeskController");
const { protect, canHandleReservation, isAdmin } = require("../middlewares/authMiddleware");
const router = require("express").Router();


router.get('/', protect, getHotdesks)

router.post('/', canHandleReservation, createHotdesk)

router.delete('/:id', canHandleReservation, deleteHotdesk)

router.put('/:id', canHandleReservation, updateHotdesk )

router.post('/report', protect, submitReport)

router.get('/reports', isAdmin, getReports)

router.patch('/reports/:id/action/:action', isAdmin, handleReport)


module.exports = router