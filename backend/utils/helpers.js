const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const asyncHandler = require("express-async-handler");
const AuditTrail = require("../models/auditTrailModel");
const {v4} = require('uuid');
const uuidv4 = v4

const isValidEmail = (email) => {
  const emailRegex = /@(student\.laverdad\.edu\.ph|laverdad\.edu\.ph)$/i;
  return email.match(emailRegex);
};

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const isValidPassword = (password) => {
  return /^(?=.*\d)(?=.*[a-zA-Z])(?=.*[!@#$%^&*]).{15,}/.test(password);
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

const bulkDelete = (model) =>
  asyncHandler(async (req, res) => {
    const ids = req.body.ids;

    const objectIds = ids
      .map((id) => {
        try {
          return mongoose.Types.ObjectId(id);
        } catch (error) {
          console.error(`Invalid ObjectId: ${id}`);
          return null;
        }
      })
      .filter((id) => id !== null);

    if (objectIds.length === 0) {
      return res.status(400).json({ error: "Invalid item IDs provided." });
    }

    try {
      const result = await model.deleteMany({ _id: { $in: objectIds } });

      res
        .status(200)
        .json({ success: true, message: `Items were deleted successfully` });
    } catch (error) {
      console.error("Error during bulk deletion:", error);
      res
        .status(500)
        .json({ error: "An error occurred during bulk deletion." });
    }
  });

const generatePassword = () => {
  const length = 15,
    charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let retVal = "";

  for (let i = 0, n = charset.length; i < length; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * n));
  }

  return retVal;
};

const updateAreaProperty = asyncHandler(async () => {
  const Hotdesk = require("../models/hotdeskModel");
  try {
    const ranges = [
      { start: 1, end: 26, area: 1 },
      { start: 27, end: 53, area: 2 },
      { start: 54, end: 80, area: 3 },
    ];

    for (const range of ranges) {
      await Hotdesk.updateMany(
        { deskNumber: { $gte: range.start, $lte: range.end } },
        { $set: { area: range.area } },
        { multi: true }
      );
    }

  } catch (error) {
    console.error("Error updating area property:", error);
  }
});

const createAuditTrail = asyncHandler(async (req, data) => {
  const ipAddress =
  req.headers["x-forwarded-for"] ||
    req.ip ||
    req.headers["true-client-ip"] ||
    req.remoteAddress ||
    req.socket?.remoteAddress ||
    null;
    
  const userId = req.user?._id;

  const { email, actionType, actionDetails, status, additionalContext } = data;

  try {
    await AuditTrail.create({
      user: userId ?? null,
      email: req.user?.email ?? email,
      actionType,
      actionDetails,
      status,
      additionalContext,
      ipAddress,
    });
  } catch (error) {
    console.error("Error creating audit trail:", error);
  }

  // io.emit('new-trail', auditTrail)

  // console.log(io.emit('new-trail', auditTrail))
});

const generateDeviceToken = async () => {
  const deviceToken = uuidv4()
  const hashedDeviceToken = await hashPassword(deviceToken);

  return [deviceToken, hashedDeviceToken]
}

module.exports = {
  isValidEmail,
  hashPassword,
  isValidPassword,
  generateToken,
  bulkDelete,
  generatePassword,
  updateAreaProperty,
  createAuditTrail,
  generateDeviceToken
};
