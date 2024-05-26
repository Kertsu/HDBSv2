const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const { createFeedback, getFeedbacks } = require("../controllers/feedbackController");
const router = express.Router();

router.post('/', protect, createFeedback)

router.get('/feedback', protect, getFeedbacks)

module.exports = router