const Hotdesk = require("../models/hotdeskModel");
const asyncHandler = require("express-async-handler");
const queryHelper = require("../utils/queryHelper");

const getHotdesks = asyncHandler(async (req, res) => {
  try {
    const desks = await queryHelper(Hotdesk, req.query, "hotdesk");

    res.status(200).json({
      success: true,
      desks,
      totalDocuments: await Hotdesk.countDocuments(),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

module.exports = { getHotdesks };
