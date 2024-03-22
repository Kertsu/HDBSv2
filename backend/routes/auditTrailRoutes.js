const express = require('express')
const { isAdmin, logger } = require('../middlewares/authMiddleware')
const { getAuditTrails, createAuditTrail } = require('../controllers/auditTrailController')
const router = express.Router()

router.get('/', isAdmin, getAuditTrails);

router.post('/', logger,createAuditTrail);


module.exports = router