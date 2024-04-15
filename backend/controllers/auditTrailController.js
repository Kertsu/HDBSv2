const asyncHandler = require("express-async-handler");
const AuditTrail = require("../models/auditTrailModel");
const queryHelper = require("../utils/queryHelper");

const getAuditTrails = asyncHandler(async (req, res) => {
  const trails = await queryHelper(AuditTrail, req.query, "trail");

  return res.status(200).json({
    success: true,
    trails,
  });
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

  return res.status(201).json({
    success: true,
    auditTrail,
  });
});

module.exports = { createAuditTrail, getAuditTrails };
