const { protect, isAdmin } = require("../middlewares/authMiddleware");
const router = require("express").Router();

module.exports = router