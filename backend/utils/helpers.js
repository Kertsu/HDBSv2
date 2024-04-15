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
