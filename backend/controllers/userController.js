const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const {
  generateToken,
  isValidPassword,
  hashPassword,
  isValidEmail,
} = require("../utils/helpers");

const User = require("../models/userModel");
const Notification = require("../models/notificationModel");
const cloudinary = require("../config/cloudinary");
/**
 * Register a user
 */
const register = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: "Please fill in all mandatory fields",
    });
  }

  const userExist = await User.findOne({ email });

  if (userExist) {
    return res.status(400).json({
      success: false,
      error: "User already exists",
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ success: false, error: "Email not allowed" });
  }

  if (password.length < 10 || !isValidPassword(password)) {
    return res.status(400).json({
      success: false,
      error:
        "Invalid password. It should be at least 10 characters long and contain a mix of alphanumeric and special characters",
    });
  }

  const hashedPassword = await hashPassword(password);
  const username = email.split("@")[0];

  try {
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      sucecss: true,
      user,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: "Invalid user data",
    });
  }
});

/**
 * Login
 */
const authenticate = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  const userByEmail = await User.findOne({ email });
  const userByUsername = await User.findOne({ username });

  if (!userByEmail && !userByUsername) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid credentials" });
  }

  const user = userByEmail || userByUsername;

  if (await bcrypt.compare(password, user.password)) {
    if (user.isDisabled) {
      return res
        .status(400)
        .json({ success: false, error: "Your account is suspended" });
    }

    const userData = {
      id: user.id,
      role: user.role,
      username: user.username,
      email: user.email,
      token: generateToken(user.id),
      receivingEmail: user.receivingEmail,
      description: user.description,
    };

    res.status(200).json({
      success: true,
      user: userData,
    });
  } else {
    res.status(400).json({ success: false, error: "Invalid credentials" });
  }
});

/**
 * Get self
 */
const getSelf = asyncHandler(async (req, res) => {
  const { id, username, email, role, avatar, banner, description } =
    await User.findById(req.user.id);

  res.status(200).json({
    sucecss: true,
    user: {
      id,
      username,
      email,
      role,
      avatar,
      banner,
      description,
    },
  });
});

/**
 * Delete a user
 */
const deleteUser = asyncHandler(async (req, res) => {
  const userToDelete = await User.findById(req.params.id);

  if (!userToDelete) {
    res.status(400);
    throw new Error("User not found");
  }

  const requestingUser = req.user;

  if (userToDelete._id.equals(requestingUser._id)) {
    res
      .status(403)
      .json({ success: false, error: "You cannot delete your account." });
    return;
  }

  if (
    requestingUser.role === "admin" &&
    userToDelete.role !== "admin" &&
    userToDelete.role !== "superadmin"
  ) {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, deletedUser });
  } else if (
    requestingUser.role === "superadmin" &&
    userToDelete.role !== "superadmin"
  ) {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, deletedUser });
  } else {
    res.status(403).json({ success: false, error: "Permission denied" });
  }
});

/**
 * Upload avatar
 */
const uploadAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({ success: false, error: "User not found" });
  }

  console.log(user);

  cloudinary.uploader.upload(req.file.path, async (err, result) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: "Cannot upload avatar",
      });
    }

    user.avatar = result.url;

    await user.save();

    res.status(200).json({
      success: true,
    });
  });
});

/**
 * Upload banner
 */
const uploadBanner = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({ success: false, error: "User not found" });
  }

  console.log(user);

  cloudinary.uploader.upload(req.file.path, async (err, result) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: "Cannot upload banner",
      });
    }

    user.banner = result.url;

    await user.save();

    res.status(200).json({
      success: true,
    });
  });
});

/**
 * Get self notifications
 */
const getNotifications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const notifications = await Notification.find({ user: req.user.id })
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    success: true,
    notifications,
    currentPage: page,
    totalPages: Math.ceil(
      (await Notification.countDocuments({ user: req.user.id })) / limit
    ),
    totalDocuments: await Notification.countDocuments({ user: req.user.id }),
  });
});

/**
 * Update self
 */
const updateSelf = asyncHandler(async (req, res) => {
  const { username, description } = req.body;
  const user = await User.findById(req.user.id);

  if (!user) {
    res.status(404).json({
      success: false,
      error: "User not found",
    });
  }

  if (username && !/^[a-zA-Z_]+$/.test(username)) {
    return res.status(400).json({
      success: false,
      error: "Invalid username",
    });
  }

  if (req.file) {
    cloudinary.uploader.upload(req.file.path, async (err, result) => {
      if (err) {
        return res.status(500).json({
          success: false,
          error: "Cannot upload avatar",
        });
      }

      user.avatar = result.url;
      await user.save();
    });
  }

  if (username) {
    user.username = username;
  }

  if (description) {
    user.description = description;
  }

  try {
    await user.save();
    res.status(200).json({ success: true, user });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Error saving user",
    });
  }
});

/**
 * Update user role
 */
const updateRole = asyncHandler(async (req, res) => {
  const userToUpdate = await User.findById(req.params.id);

  if (!userToUpdate) {
    res.status(400);
    throw new Error("User not found");
  }

  const requestingUser = req.user;

  if (userToUpdate._id.equals(requestingUser._id)) {
    res
      .status(403)
      .json({ success: false, error: "You cannot update your own role." });
    return;
  }

  if (
    requestingUser.role === "admin" &&
    userToUpdate.role !== "admin" &&
    userToUpdate.role !== "superadmin"
  ) {
    const updatedUser = await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, updatedUser });
  } else if (
    requestingUser.role === "superadmin" &&
    userToUpdate.role !== "superadmin"
  ) {
    const updatedUser = await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, updatedUser });
  } else {
    res.status(403).json({ success: false, error: "Permission denied" });
  }
});

/**
 * Update user password
 */
const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: "User not found",
    });
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    return res.status(400).json({
      success: false,
      error: "Current password is incorrect",
    });
  }

  if(newPassword !== confirmPassword){
    return res.status(400).json({
      success: false,
      error: "Passwords did not match",
    });
  }

  const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+}{"':;?/>.<,]).{10,}$/;
  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({
      success: false,
      error:
        "Invalid password. It should be at least 10 characters long and contain a mix of alphanumeric characters, lowercase, uppercase, and symbols",
    });
  }

  const hashedPassword = await hashPassword(newPassword);

  user.password = hashedPassword;

  try {
    await user.save();
    res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Error updating password",
    });
  }
});



module.exports = {
  register,
  authenticate,
  getSelf,
  deleteUser,
  uploadAvatar,
  getNotifications,
  updateSelf,
  updateRole,
  uploadBanner,
  updatePassword
};
