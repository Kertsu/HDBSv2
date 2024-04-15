const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const asyncHandler = require("express-async-handler");

const isValidEmail = (email) => {
  const emailRegex = /@(student\.laverdad\.edu\.ph|laverdad\.edu\.ph)$/i;
  return email.match(emailRegex);
};