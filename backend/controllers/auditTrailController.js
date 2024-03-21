const asyncHandler = require("express-async-handler");
const AuditTrail = require("../models/auditTrailModel");

const getAuditTrails = asyncHandler(async (req, res) => {
 
});

const createAuditTrail = asyncHandler(async (req, res) => {
  const ipAddress =
    req.ip ||
    req.headers["x-forwarded-for"] ||
    req.headers["true-client-ip"] ||
    req.remoteAddress ||
    req.socket.remoteAddress ||
    null;
  const userId = req.user?._id;
  

  const { email, actionType, actionDetails, status, additionalContext } =
    req.body;

  const auditTrail = await AuditTrail.create({
    user: userId ?? null,
    email: req.user?.email ?? email,
    actionType,
    actionDetails,
    status,
    additionalContext,
    ipAddress,
  });

  // io.emit('new-trail', auditTrail)

  // console.log(io.emit('new-trail', auditTrail))

  console.log('exec')
  res.status(201).json({
    message: 'success',
    auditTrail
  })
});

module.exports = { createAuditTrail, getAuditTrails };
