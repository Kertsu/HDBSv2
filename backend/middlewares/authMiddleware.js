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

      req.user = await User.findById(decoded.id).select("-password");
      next();
    } catch (error) {
      res.status(401).json({ error: "Not authorized" });
    }
  }

  if (!token) {
    res.status(401).json({ error: "Not authorized. Token does not exist." });
  }
});

const isAdmin = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select("-password");

      if (req.user.role !== "admin" && req.user.role !== "superadmin") {
        res.status(403).json({ error: "Forbidden" });
      }
      next();
    } catch (error) {
      res.status(401).json({ error: "Not authorized" });
    }
  }

  if (!token) {
    res.status(401).json({ error: "Not authorized. Token does not exist." });
  }
});

const canHandleReservation = asyncHandler(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select("-password");

      console.log(req.user.role);
      if (
        req.user.role !== "admin" &&
        req.user.role !== "superadmin" &&
        req.user.role !== "om"
      ) {
        return res.status(403).json({ message: "Forbidden" });
      }
      next();
    } catch (error) {
      res.status(403);
      throw new Error("Forbidden");
    }
  }

  if (!token) {
    res.status(401);
    return res
      .status(401)
      .json({
        success: false,
        message: "Not authorized. Token does not exist.",
      });
  }
});

const logger = asyncHandler(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select("-password");
    } catch (error) {}
  }

  next();
});

module.exports = { protect, isAdmin, canHandleReservation, logger };
