const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const asyncHandler = require("express-async-handler");

const isValidEmail = (email) => {
  const emailRegex = /@(student\.laverdad\.edu\.ph|laverdad\.edu\.ph)$/i;
  return email.match(emailRegex);
};

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const isValidPassword = (password) => {
  return /^(?=.*\d)(?=.*[a-zA-Z])(?=.*[!@#$%^&*])/.test(password);
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

const bulkDelete = (model) =>
  asyncHandler(async (req, res) => {
    const ids = req.body.ids;
    console.log(ids);

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
      console.log("Deletion result:", result);

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

async function updateAreaProperty() {
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

    console.log("Area property updated successfully.");
  } catch (error) {
    console.error("Error updating area property:", error);
  }
}
