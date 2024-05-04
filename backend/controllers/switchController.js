const Switch = require('../models/switchModel')
const asyncHandler = require('express-async-handler');
const { createAuditTrail } = require('../utils/helpers');
const ActionType = require('../utils/trails.enum');

const handleSwitch = asyncHandler(async (req, res) => {
  const { autoAccepting } = req.body;

  if (typeof autoAccepting !== 'boolean') {
    return res.status(400).json({ success: false, errror: '"autoAccepting" must be a boolean.' });
  }

  const updatedSwitch = await Switch.findOneAndUpdate(
    {},
    { autoAccepting },
    { new: true, upsert: true }
  );

  createAuditTrail(req, {
    actionType: ActionType.RESERVATION_MANAGEMENT, actionDetails: `turned ${autoAccepting ? "on" : "off"} automatic accepting of reservations`, status: "success"
  })

  return res.status(200).json({success: true, updatedSwitch});
});


const getSwitchState = asyncHandler(async(req, res) => {
  const autoAcceptSwitch = await Switch.findOne();

  return res.status(200).json({success: true, autoAcceptSwitch})
})

module.exports = {handleSwitch, getSwitchState};