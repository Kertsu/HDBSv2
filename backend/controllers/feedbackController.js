const asyncHandler = require("express-async-handler");
const Feedback = require("../models/feedbackModel");
const Hotdesk = require("../models/hotdeskModel");
const UserReview = require("../models/userReviewModel");
const User = require("../models/userModel");
const queryHelper = require("../utils/queryHelper");
const ActionType = require("../utils/trails.enum");
const { createAuditTrail } = require("../utils/helpers");
const {Types} = require('mongoose')

const createFeedback = asyncHandler(async (req, res) => {
  const { deskNumber, rating, description, reservation } = req.body;

  const actionType = ActionType.FEEDBACK;
  const actionDetails = `submit feedback for Hotdesk #${deskNumber}`;
  let error;

  if (!deskNumber || !rating) {
    error = "Please rate before submitting feedback";
    createAuditTrail(req, {
      actionType,
      actionDetails,
      status: "failed",
      additionalContext: error,
    });
    return res.status(400).json({ success: false, error });
  }

  try {
    const desk = await Hotdesk.findOne({ deskNumber });
    if (!desk) {
      throw new Error("Desk not found");
    }

    const user = req.user;

    const feedback = await Feedback.create({
      desk: desk.id || desk._id,
      rating,
      description: description || null,
      user: user._id,
      deskNumber,
      reservation,
    });

    const review = await UserReview.findOne({ user: user._id, deskNumber, reservation: new Types.ObjectId(reservation) })

    review.status = "RATED";
    await review.save();

    await User.findOneAndUpdate({ _id: user._id }, { $inc: { toRate: -1 } });

    createAuditTrail(req, {
      actionType,
      actionDetails,
      status: "success",
      additionalContext: `${user.username} gave a ${rating}/5 rating on Hotdesk #${deskNumber}`,
    });
    return res.status(200).json({ success: true, feedback });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
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
