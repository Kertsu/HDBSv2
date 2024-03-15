const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const ayncHandler = require("express-async-handler");

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

const bulkDelete = (model) => ayncHandler(async (req, res) => {

  const ids = req.body.items

  try {
    model.deleteMany({_id: {$in: ids}})

    res.status(200).json({success: true ,message: `Items were deleted successfully`})
  } catch (error) {
    console.error("Error during bulk deletion:", error);
    res.status(500).json({ error: "An error occurred during bulk deletion." });
  }
});

module.exports = {
  isValidEmail,
  hashPassword,
  isValidPassword,
  generateToken,
  bulkDelete,
};
