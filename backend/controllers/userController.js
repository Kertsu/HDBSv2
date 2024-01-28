const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");



const User = require("../models/userModel");
const cloudinary = require("../config/cloudinary");

/**
 * Register a user
 */
const register = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: "Please fill in all mandatory fields",
    });
  }

  const userExist = await User.findOne({ email });

  if (userExist) {
    return res.status(400).json({
      error: "User already exists",
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Email not allowed" });
  }

  if (password.length < 10 || !isValidPassword(password)) {
    return res.status(400).json({
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
      message: "success",
      user,
    });
  } catch (error) {
    res.status(400).json({
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
    return res.status(400).json({ error: "Invalid credentials" });
  }

  const user = userByEmail || userByUsername;

  if (await bcrypt.compare(password, user.password)) {
    if (user.isDisabled) {
      return res.status(400).json({ error: "Your account is suspended" });
    }

    const userData = {
      id: user.id,
      role: user.role,
      username: user.username,
      email: user.email,
      token: generateToken(user.id),
    };

    res.status(200).json({
      message: "success",
      user: userData,
    });
  } else {
    res.status(400).json({ error: "Invalid credentials" });
  }
});

/**
 * Get self
 */
const getSelf = asyncHandler(async (req, res) => {
  const { id, username, email, role, avatar } = await User.findById(
    req.user.id
  );

  res.status(200).json({
    message: "success",
    user: {
      id,
      username,
      email,
      role,
      avatar,
    },
  });
});

/**
 * Delete a user
 */
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(400);
    throw new Error("User not found");
  }

  if (req.params.id !== req.user.id) {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    res.status(200).json({message:"success", id: deletedUser.id });
  } else {
    res.status(400).json({error: "Error while deleting entity"});
  }
});

/**
 * Upload avatar
 */
const uploadAvatar = asyncHandler(async (io, req, res) => {

  const user = await User.findById(req.user.id)

  if(!user){
    return res.status(404).json({error: "User not found"})
  }

  cloudinary.uploader.upload(req.file.path, async (err, result) => {
    if (err) {
      return res.status(500).json({
        error: "Cannot upload avatar"
      })
    }

    user.avatar = result.url

    await user.save();

    res.status(200).json(
      {
        message: "success",
      }
    )
  })
})

module.exports = { register, authenticate, getSelf, deleteUser, uploadAvatar };

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

const sendNotification = (io, userId, message) => {
  io.to(userId).emit('notification', { message });
};