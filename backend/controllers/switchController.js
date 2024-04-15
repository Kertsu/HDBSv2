const Switch = require('../models/switchModel')
const asyncHandler = require('express-async-handler')

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

  return res.status(200).json({success: true, updatedSwitch});
});


const getSwitchState = asyncHandler(async(req, res) => {
  const autoAcceptSwitch = await Switch.findOne();

  return res.status(200).json({success: true, autoAcceptSwitch})
})

module.exports = {handleSwitch, getSwitchState};