const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");

const User = require("../models/userModel");

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log(decoded)

      req.user = await User.findById(decoded.id).select("-password");
      console.log(req.user)
      next();
    } catch (error) {
      res.status(401).json({ error: "Not authorized" });
    }
  }

  if (!token) {
    res.status(401).json({ error: "Not authorized. Token does not exist." });
  }
});

module.exports = {protect}