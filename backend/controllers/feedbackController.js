const asyncHandler = require("asyncHandler");
const Feedback = require("../models/feedbackModel");
const queryHelper = require("../utils/queryHelper");

const createFeedback = asyncHandler(async (req, res) => {
  const { deskNumber, rating, description } = req.body;

  if (!deskNumber || !rating) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  const desk = await Hotdesk.findOne({ deskNumber });

  const feedback = Feedback.create({
    desk: desk.id || desk._id,
    rating,
    description,
    user: req.user,
  });

  return res.status(200).json({ success: true, feedback });
});

const getFeedbacks = asyncHandler(async (req, res) => {
  try {
    const feedbacks = await queryHelper(Feedback, req.query, "feedback");

    res.status(200).json({
      success: true,
      feedbacks,
      totalDocuments: await Feedback.countDocuments(),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

module.exports = { createFeedback, getFeedbacks };
