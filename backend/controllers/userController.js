const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const {
  generateToken,
  hashPassword,
  isValidPassword,
  createAuditTrail,
  isValidEmail,
  generateDeviceToken,
} = require("../utils/helpers");

const User = require("../models/userModel");
const Notification = require("../models/notificationModel");
const cloudinary = require("../config/cloudinary");
const queryHelper = require("../utils/queryHelper");
const {
  sendCredentials,
  sendMagicLink,
  sendPasswordResetSuccess,
  sendOTP,
} = require("../utils/mail.util");
const ActionType = require("../utils/trails.enum");
/**
 * Register a user
 */
const register = asyncHandler(async (req, res) => {
  const { email } = req.body;
  let error;
  const actionType = ActionType.REGISTRATION;

  if (!email) {
    error = "Please fill in all mandatory fields";
    createAuditTrail(req, {
      actionType,
      actionDetails: `Registration attempt for ${email}`,
      status: "failed",
      additionalContext: "Invalid credentials",
    });
    return res.status(400).json({
      success: false,
      error,
    });
  }

  const userExist = await User.findOne({ email });

  if (userExist) {
    error = "User already exists";
    createAuditTrail(req, {
      actionType,
      actionDetails: `Registration attempt for ${email}`,
      status: "failed",
      additionalContext: error,
    });
    return res.status(400).json({
      success: false,
      error,
    });
  }

  if (!isValidEmail(email)) {
    error = "Email not allowed";
    createAuditTrail(req, {
      actionType,
      actionDetails: `Registration attempt for ${email}`,
      status: "failed",
      additionalContext: error,
    });
    return res.status(400).json({ success: false, error });
  }

  const username = email.split("@")[0];

  try {
    sendCredentials(email, username, req, res);
  } catch (err) {
    error = "Invalid user data";
    res.status(400).json({
      success: false,
      error,
    });
  }
});

/**
 * Login
 */
const authenticate = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  const actionType = ActionType.LOGIN;
  const actionDetails = `Login attempt for ${email || username}`;
  let error;

  const userByEmail = await User.findOne({ email });
  const userByUsername = await User.findOne({ username });

  if (!userByEmail && !userByUsername) {
    error = "Invalid credentials";
    createAuditTrail(req, {
      email,
      actionType,
      actionDetails,
      status: "failed",
      additionalContext: error,
    });
    return res.status(400).json({ success: false, error });
  }

  const user = userByEmail || userByUsername;

  if (await bcrypt.compare(password, user.password)) {
    if (user.isDisabled) {
      createAuditTrail(req, {
        email,
        actionType,
        actionDetails,
        status: "failed",
        additionalContext: "Account is suspended",
      });
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
      passwordChangedAt: user.passwordChangedAt,
    };

    const desksyncv2DeviceToken = req.headers["desksyncv2-device-token"];

    const [deviceToken, hashedDeviceToken] = await generateDeviceToken();

    /**
     * @todo delete after presentation
     */
    if (user.email === "hdbs.desksync@gmail.com") {
      createAuditTrail(req, {
        email,
        actionType,
        actionDetails,
        status: "success",
      });

      user.otpRequired = false;
      await user.save();

      return res.status(200).json({
        success: true,
        user: userData,
      });
    }

    // console.log((await bcrypt.compare(desksyncv2DeviceToken, user.registeredDeviceToken)), 'LN151')
    if (!desksyncv2DeviceToken && user.registeredDeviceToken) {
      createAuditTrail(req, {
        email,
        actionType,
        actionDetails,
        status: "success",
        additionalContext: "Login attempt from a new device",
      });

      user.otpRequired = true;
      await user.save();

      sendOTP({ email, name: user.username }, req, res);

      return res.status(200).json({
        success: true,
        user: userData,
        OTP: true,
        deviceToken,
      });
    }

    if (
      user.registeredDeviceToken &&
      desksyncv2DeviceToken &&
      !(await bcrypt.compare(desksyncv2DeviceToken, user.registeredDeviceToken))
    ) {
      createAuditTrail(req, {
        email,
        actionType,
        actionDetails,
        status: "success",
        additionalContext: "Login attempt from another device",
      });

      user.otpRequired = true;
      await user.save();

      sendOTP({ email, name: user.username }, req, res);

      return res.status(200).json({
        success: true,
        user: userData,
        OTP: true,
      });
    }

    createAuditTrail(req, {
      email,
      actionType,
      actionDetails,
      status: "success",
    });

    user.otpRequired = false;
    await user.save();

    return res.status(200).json({
      success: true,
      user: userData,
    });
  } else {
    error = "Invalid credentials";
    createAuditTrail(req, {
      email,
      actionType,
      actionDetails,
      status: "failed",
      additionalContext: error,
    });
    return res.status(400).json({ success: false, error });
  }
});

/**
 * Get self
 */
const getSelf = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select(
    "-password -verification"
  );

  res.status(200).json({
    success: true,
    user,
  });
});

/**
 * Delete a user
 */
const deleteUser = asyncHandler(async (req, res) => {
  const userToDelete = await User.findById(req.params.id);
  const actionType = ActionType.USER_MANAGEMENT;
  const actionDetails = `Delete user ${userToDelete.email}`;

  if (!userToDelete) {
    createAuditTrail(req, {
      actionType,
      actionDetails: "Deleting a user",
      status: "failed",
      additionalContext: "Trying to delete a user that doesn't exist",
    });
    return res.status(400).json({ success: false, error: "User not found" });
  }

  const requestingUser = req.user;

  if (userToDelete._id.equals(requestingUser._id)) {
    createAuditTrail(req, {
      actionType,
      actionDetails,
      status: "failed",
      additionalContext: "Trying to delete own account",
    });
    return res
      .status(403)
      .json({ success: false, error: "You cannot delete your account." });
  }

  let deletedUser;

  if (
    requestingUser.role === "admin" &&
    userToDelete.role !== "admin" &&
    userToDelete.role !== "superadmin"
  ) {
    await User.deleteUserWithCascade(req.params.id)
    createAuditTrail(req, {
      actionType,
      actionDetails,
      status: "success",
    });
    return res.status(200).json({ success: true, deletedUser: userToDelete });
  } else if (
    requestingUser.role === "superadmin" &&
    userToDelete.role !== "superadmin"
  ) {
    createAuditTrail(req, {
      actionType,
      actionDetails,
      status: "success",
    });
    await User.deleteUserWithCascade(req.params.id)
    return res.status(200).json({ success: true, deletedUser: userToDelete });
  } else {
    const error = "Permission denied";
    createAuditTrail(req, {
      actionType,
      actionDetails,
      status: "failed",
      additionalContext: error,
    });
    return res.status(403).json({ success: false, error });
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
      message: "Avatar uploaded successfully",
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
      message: "Banner uploaded successfully",
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
  const user = await User.findById(req.user.id).select("-password");

  const actionType = ActionType.PROFILE_MANAGEMENT;
  const actionDetails = `Update profile`;
  let error;

  const defaultBanner =
    "https://res.cloudinary.com/drlztlr1m/image/upload/v1708332794/memuvo7apu0eqdt4f6mr.svg";
  const defaultAvatar =
    "https://res.cloudinary.com/drlztlr1m/image/upload/v1706979188/oxbsppubd3rsabqwfxsr.jpg";

  if (!user) {
    return res.status(404).json({
      success: false,
      error: "User not found",
    });
  }

  if (username && !/^[a-zA-Z_]+$/.test(username)) {
    error = "Invalid username";
    createAuditTrail(req, {
      actionType,
      actionDetails,
      status: "failed",
      additionalContext: error,
    });
    return res.status(400).json({
      success: false,
      error,
    });
  }

  if (req.files && req.files["avatar"]) {
    const avatar = req.files["avatar"][0];
    cloudinary.uploader.upload(avatar.path, async (err, result) => {
      if (err) {
        return res.status(500).json({
          success: false,
          error: "Cannot upload avatar",
        });
      }
      user.avatar = result.url;
      await user.save();
    });
  } else if (
    req.body.defaultAvatar &&
    req.body.defaultAvatar === defaultAvatar
  ) {
    user.avatar = defaultAvatar;
  }

  if (req.files && req.files["banner"]) {
    const banner = req.files["banner"][0];
    cloudinary.uploader.upload(banner.path, async (err, result) => {
      if (err) {
        return res.status(500).json({
          success: false,
          error: "Cannot upload banner",
        });
      }
      user.banner = result.url;
      await user.save();
    });
  } else if (
    req.body.defaultBanner &&
    req.body.defaultBanner === defaultBanner
  ) {
    user.banner = defaultBanner;
  }

  if (username) {
    user.username = username;
  }

  if (description) {
    user.description = description;
  }

  try {
    createAuditTrail(req, {
      actionType,
      actionDetails,
      status: "success",
    });
    await user.save();
    return res
      .status(200)
      .json({ success: true, user, message: "Profile updated successfully!" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Error saving user",
    });
  }
});

// const updateSelf = asyncHandler(async (req, res) => {
//   const { username, description } = req.body;
//   const user = await User.findById(req.user.id).select("-password");

//   const defaultBanner =
//     "https://res.cloudinary.com/drlztlr1m/image/upload/v1708332794/memuvo7apu0eqdt4f6mr.svg";
//   const defaultAvatar =
//     "http://res.cloudinary.com/drlztlr1m/image/upload/v1706979188/oxbsppubd3rsabqwfxsr.jpg";

//   if (!user) {
//     return res.status(404).json({
//       success: false,
//       error: "User not found",
//     });
//   }

//   if (username && !/^[a-zA-Z_]+$/.test(username)) {
//     return res.status(400).json({
//       success: false,
//       error: "Invalid username",
//     });
//   }

//   try {
//     if (req.files && req.files["avatar"]) {
//       const avatar = req.files["avatar"][0];
//       const avatarUploadResult = await cloudinary.uploader.upload(avatar.path);
//       user.avatar = avatarUploadResult.url;
//     } else if (req.body.defaultAvatar && req.body.defaultAvatar === defaultAvatar) {
//       user.avatar = defaultAvatar;
//     }

//     if (req.files && req.files["banner"]) {
//       const banner = req.files["banner"][0];
//       const bannerUploadResult = await cloudinary.uploader.upload(banner.path);
//       user.banner = bannerUploadResult.url;
//     } else if (req.body.defaultBanner && req.body.defaultBanner === defaultBanner) {
//       user.banner = defaultBanner;
//     }

//     if (username) {
//       user.username = username;
//     }

//     if (description) {
//       user.description = description;
//     }

//     await user.save();

//     return res
//       .status(200)
//       .json({ success: true, user, message: "Profile updated successfully!" });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       error: "Error saving user",
//     });
//   }
// });

/**
 * Update user role
 */
const updateUser = asyncHandler(async (req, res) => {
  // const { username, role, email } = req.body;
  const { username, role } = req.body;

  const userToUpdate = await User.findById(req.params.id);

  const actionType = ActionType.USER_MANAGEMENT;
  const actionDetails = `update ${userToUpdate.email}`;
  let error;

  if (!userToUpdate) {
    createAuditTrail(req, {
      actionType,
      actionDetails,
      status: "failed",
      additionalContext: "Trying to update a user that does not exist",
    });
    return res.status(400).json({ success: false, error: "User not found" });
  }

  const requestingUser = req.user;

  if (
    requestingUser.role === "superadmin" &&
    userToUpdate.role !== "superadmin" &&
    role !== "superadmin"
  ) {
    userToUpdate.username = username || userToUpdate.username;
    userToUpdate.role = role || userToUpdate.role;

    await userToUpdate.save();

    createAuditTrail(req, {
      actionType,
      actionDetails,
      status: "success",
      additionalContext: `${userToUpdate.email} updated`,
    });

    return res.status(200).json({ success: true, updatedUser: userToUpdate });
  } else if (
    requestingUser.role === "admin" &&
    userToUpdate.role !== "admin" &&
    userToUpdate.role !== "superadmin" &&
    role !== "superadmin" &&
    role !== "admin"
  ) {
    // Admins can update regular users
    userToUpdate.username = username || userToUpdate.username;
    userToUpdate.role = role || userToUpdate.role;

    await userToUpdate.save();

    createAuditTrail(req, {
      actionType,
      actionDetails,
      status: "success",
      additionalContext: `${userToUpdate.email} updated`,
    });

    return res.status(200).json({ success: true, updatedUser: userToUpdate });
  } else {
    error = "Permission denied";
    createAuditTrail(req, {
      actionType,
      actionDetails,
      status: "success",
      additionalContext: error,
    });
    return res.status(403).json({ success: false, error });
  }
});

/**
 * Update user password
 */
const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const user = await User.findById(req.user.id);
  const actionType = ActionType.PROFILE_MANAGEMENT;
  const actionDetails = `change password`;
  let error;

  if (!user) {
    return res.status(404).json({
      success: false,
      error: "User not found",
    });
  }

  const oneDay = 24 * 60 * 60 * 1000;

  const passwordChangedAt = new Date(user.passwordChangedAt).getTime();
  const currentTime = new Date().getTime();

  // const cooldownRemaining = Math.ceil(
  //   (passwordChangedAt + oneDay - currentTime) / (60 * 60 * 1000)
  // );

  // if (currentTime - passwordChangedAt < oneDay) {
  //   error = `Change password in cooldown`;
  //   createAuditTrail(req, {
  //     actionType,
  //     actionDetails,
  //     status: "failed",
  //     additionalContext: error,
  //   });
  //   return res.status(400).json({
  //     success: false,
  //     error: `${error}. ${cooldownRemaining} hours remaining`,
  //   });
  // }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    error = "Current password is incorrect";
    createAuditTrail(req, {
      actionType,
      actionDetails,
      status: "failed",
      additionalContext: error,
    });
    return res.status(400).json({
      success: false,
      error,
    });
  }

  if (newPassword !== confirmPassword) {
    error = "Passwords did not match";
    createAuditTrail(req, {
      actionType,
      actionDetails,
      status: "failed",
      additionalContext: error,
    });
    return res.status(400).json({
      success: false,
      error,
    });
  }

  if (!isValidPassword(newPassword)) {
    error =
      "Password should be at least 15 characters long and contain a mix of alphanumeric characters, lowercase, uppercase, and symbols";
    createAuditTrail(req, {
      actionType,
      actionDetails,
      status: "failed",
      additionalContext: error,
    });
    return res.status(400).json({
      success: false,
      error,
    });
  }

  const hashedPassword = await hashPassword(newPassword);

  user.password = hashedPassword;
  user.passwordChangedAt = Date.now();

  try {
    await user.save();
    const message = "Password updated successfully";
    createAuditTrail(req, {
      actionType,
      actionDetails,
      status: "success",
      additionalContext: message,
    });
    return res.status(200).json({ success: true, message });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Error updating password",
    });
  }
});

/**
 * Update email preference
 */
const updateNotificationSettings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");

  const { receivingEmail } = req.body;

  if (!user) {
    return res.status(404).json({
      success: false,
      error: "User not found",
    });
  }

  try {
    user.receivingEmail = receivingEmail;

    await user.save();
    res.status(200).json({
      success: true,
      message: "Email preferences updated successfully",
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Error updating email preferences",
    });
  }
});

/**
 * Fetch all users (admin only)
 */
const getUsers = asyncHandler(async (req, res) => {
  // console.log(req.query);
  try {
    const users = await queryHelper(User, req.query, "user");

    res.status(200).json({
      success: true,
      users,
      totalDocuments: await User.countDocuments(),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * Change password at first login
 */
const firstChangePassword = asyncHandler(async (req, res) => {
  const { password, confirmPassword } = req.body;
  const user = await User.findById(req.user.id);

  const actionType = ActionType.PROFILE_MANAGEMENT;
  const actionDetails = `change password`;
  let error;

  if (!user) {
    return res.status(404).json({
      success: false,
      error: "User not found",
    });
  }

  // if (user.passwordChangedAt !== null) {
  //   createAuditTrail(req, {
  //     actionType,
  //     actionDetails,
  //     status: "failed",
  //     additionalContext: "Password already changed",
  //   });
  //   return res.status(400).json({
  //     success: false,
  //     error: "Invalid action",
  //   });
  // }

  if (password !== confirmPassword) {
    error = "Passwords did not match";
    createAuditTrail(req, {
      actionType,
      actionDetails,
      status: "failed",
      additionalContext: error,
    });
    return res.status(400).json({
      success: false,
      error,
    });
  }

  if (!isValidPassword(password)) {
    error =
      "Password should be at least 15 characters long and include letters, numbers, and symbols.";
    createAuditTrail(req, {
      actionType,
      actionDetails,
      status: "failed",
      additionalContext: error,
    });
    return res.status(400).json({
      success: false,
      error,
    });
  }

  const hashedPassword = await hashPassword(password);

  const [deviceToken, hashedDeviceToken] = await generateDeviceToken();

  user.password = hashedPassword;
  user.passwordChangedAt = Date.now();
  user.registeredDeviceToken = hashedDeviceToken;

  try {
    await user.save();
    const message = "Password updated successfully";
    createAuditTrail(req, {
      actionType,
      actionDetails,
      status: "success",
      additionalContext: message,
    });
    return res.status(200).json({ success: true, message, deviceToken });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Error updating password",
    });
  }
});

/**
 * Disable or enable a user
 */
const handleUser = asyncHandler(async (req, res) => {
  const { id, action } = req.params;
  const userToUpdate = await User.findById(id);
  const requestingUser = await User.findById(req.user.id);

  const actionType = ActionType.USER_MANAGEMENT;
  const actionDetails = `${action} ${userToUpdate.email}`;
  let error;

  if (!userToUpdate) {
    return res.status(400).json({ success: false, error: "User not found" });
  }

  if (userToUpdate.id === requestingUser.id) {
    createAuditTrail(req, {
      actionType,
      actionDetails,
      status: "failed",
      additionalContext: `${userToUpdate.email} ${action}d`,
    });
    return res.status(400).json({
      success: false,
      error: "Invalid action: Cannot perform action on self",
    });
  }

  const isAdmin = requestingUser.role === "admin";
  const isSuperAdmin = requestingUser.role === "superadmin";
  const isOM = requestingUser.role === "om";
  const isRegularUser = requestingUser.role === "user";

  if (isSuperAdmin) {
    if (userToUpdate.role === "superadmin") {
      createAuditTrail(req, {
        actionType,
        actionDetails,
        status: "failed",
        additionalContext: `Trying to update another superadmin`,
      });
      return res.status(403).json({
        success: false,
        error: "Permission denied: Cannot perform action on other superadmins",
      });
    }
    if (action === "disable") {
      if (!userToUpdate.isDisabled) {
        const updatedUser = await User.findByIdAndUpdate(
          id,
          { isDisabled: true },
          { new: true }
        ).select("-password");
        createAuditTrail(req, {
          actionType,
          actionDetails,
          status: "success",
          additionalContext: `${userToUpdate.email} is now disabled`,
        });
        return res.status(200).json({
          success: true,
          message: `${updatedUser.username} is now disabled`,
        });
      } else {
        error = "Invalid action: User is already disabled";
        createAuditTrail(req, {
          actionType,
          actionDetails,
          status: "failed",
          additionalContext: error,
        });
        return res.status(400).json({
          success: false,
          error,
        });
      }
    } else if (action === "enable") {
      if (userToUpdate.isDisabled) {
        const updatedUser = await User.findByIdAndUpdate(
          id,
          { isDisabled: false },
          { new: true }
        ).select("-password");
        createAuditTrail(req, {
          actionType,
          actionDetails,
          status: "success",
          additionalContext: `${userToUpdate.email} is now enabled`,
        });
        return res.status(200).json({
          success: true,
          message: `${updatedUser.username} is now enabled`,
        });
      } else {
        error = "Invalid action: User is already enabled";
        createAuditTrail(req, {
          actionType,
          actionDetails,
          status: "failed",
          additionalContext: error,
        });
        return res.status(400).json({
          success: false,
          error,
        });
      }
    } else {
      error = "Invalid action";
      createAuditTrail(req, {
        actionType,
        actionDetails,
        status: "failed",
        additionalContext: error,
      });
      return res.status(400).json({ success: false, error });
    }
  } else if (isAdmin) {
    if (userToUpdate.role === "superadmin" || userToUpdate.role === "admin") {
      createAuditTrail(req, {
        actionType,
        actionDetails,
        status: "failed",
        additionalContext: `Trying to update another admin`,
      });
      return res.status(403).json({
        success: false,
        error: "Permission denied: Cannot perform action on other admins",
      });
    }
    if ((isOM || isRegularUser) && action === "disable") {
      const updatedUser = await User.findByIdAndUpdate(
        id,
        { isDisabled: true },
        { new: true }
      ).select("-password");
      createAuditTrail(req, {
        actionType,
        actionDetails,
        status: "success",
        additionalContext: `${userToUpdate.email} is now disabled`,
      });
      return res.status(200).json({
        success: true,
        message: `${updatedUser.username} is now disabled`,
      });
    } else if ((isOM || isRegularUser) && action === "enable") {
      const updatedUser = await User.findByIdAndUpdate(
        id,
        { isDisabled: false },
        { new: true }
      ).select("-password");
      createAuditTrail(req, {
        actionType,
        actionDetails,
        status: "success",
        additionalContext: `${userToUpdate.email} is now enabled`,
      });
      return res.status(200).json({
        success: true,
        message: `${updatedUser.username} is now enabled`,
      });
    } else {
      error = "Invalid action";
      createAuditTrail(req, {
        actionType,
        actionDetails,
        status: "failed",
        additionalContext: error,
      });
      return res.status(400).json({ success: false, error });
    }
  } else {
    error = "Permission denied";
    createAuditTrail(req, {
      actionType,
      actionDetails,
      status: "failed",
      additionalContext: error,
    });
    return res.status(403).json({ success: false, error });
  }
});

/**
 * Create token for the associated email
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(400).json({ success: false, error: "User not found" });
  }

  if (!email) {
    return res
      .status(400)
      .json({ success: false, error: "Missing required fields" });
  }

  try {
    sendMagicLink(user, req, res);
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: "Invalid user data",
    });
  }
});

/**
 * Reset user's password
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token, id } = req.params;
  const { password, confirmPassword } = req.body;

  const user = await User.findById(id);

  const actionType = ActionType.PROFILE_MANAGEMENT;
  const actionDetails = `reset password`;
  let error;

  if (!user) {
    return res.status(400).json({
      success: false,
      error: "User not found",
    });
  }

  const { passwordResetToken, email, username } = user;
  const tokenValid = await bcrypt.compare(token, passwordResetToken.token);
  const tokenExpired = passwordResetToken.expiresAt < Date.now();

  if (!tokenValid) {
    error = "Invalid reset token";
    createAuditTrail(req, {
      actionType,
      actionDetails,
      status: "failed",
      additionalContext: error,
    });
    return res.status(400).json({
      success: false,
      error,
    });
  }

  if (tokenExpired) {
    error = "Reset token expired";
    createAuditTrail(req, {
      actionType,
      actionDetails,
      status: "failed",
      additionalContext: error,
    });
    return res.status(400).json({
      success: false,
      error,
    });
  }

  if (password !== confirmPassword) {
    error = "Passwords did not match";
    createAuditTrail(req, {
      actionType,
      actionDetails,
      status: "failed",
      additionalContext: error,
    });
    return res.status(400).json({
      success: false,
      error,
    });
  }

  // const oneDay = 24 * 60 * 60 * 1000;
  // const passwordChangedAt = new Date(user.passwordChangedAt).getTime();
  // const currentTime = new Date().getTime();
  // const cooldownRemaining = Math.ceil(
  //   (passwordChangedAt + oneDay - currentTime) / (60 * 60 * 1000)
  // );

  // if (currentTime - passwordChangedAt < oneDay) {
  //   error = `Change password in cooldown`;
  //   createAuditTrail(req, {
  //     actionType,
  //     actionDetails,
  //     status: "failed",
  //     additionalContext: error,
  //   });
  //   return res.status(400).json({
  //     success: false,
  //     error: `${error}. ${cooldownRemaining} hours remaining.`,
  //   });
  // }

  if (!isValidPassword(password)) {
    error =
      "Password should be at least 15 characters long and contain a mix of alphanumeric characters, lowercase, uppercase, and symbols.";
    createAuditTrail(req, {
      actionType,
      actionDetails,
      status: "failed",
      additionalContext: error,
    });
    return res.status(400).json({
      success: false,
      error,
    });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  user.password = hashedPassword;
  user.passwordChangedAt = Date.now();
  user.passwordResetToken = undefined;

  try {
    sendPasswordResetSuccess(user, req, res);
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: "An error occurred.",
    });
  }
});

/**
 * Validate the reset token
 */
const validateResetToken = asyncHandler(async (req, res) => {
  const { token, id } = req.params;

  try {
    const user = await User.findById(id);

    const { passwordResetToken } = user;
    const tokenValid = await bcrypt.compare(token, passwordResetToken.token);
    const tokenExpired = passwordResetToken.expiresAt < Date.now();

    if (!passwordResetToken || !user || !tokenValid || tokenExpired) {
      return res.status(400).json({
        success: false,
        error:
          "It appears that the password reset link you clicked on is invalid. Please try again.",
      });
    }

    res.status(200).json({ success: true, message: "Reset token is valid" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error:
        "It appears that the password reset link you clicked on is invalid. Please try again.",
    });
  }
});

/**
 * Validate verification code
 */
const validateOTP = asyncHandler(async (req, res) => {
  const { otp } = req.body;
  const user = await User.findById(req.user.id);

  const actionType = ActionType.LOGIN;
  const actionDetails = `verify OTP`;
  let error;

  if (!user) {
    return res.status(400).json({
      success: false,
      error: "User not found",
    });
  }

  const otpValid =
    user.verification &&
    (await bcrypt.compare(otp, user.verification.code)) &&
    user.verification.expiresAt > Date.now();
  if (!otpValid) {
    error = "You seem to have entered an invalid verification code";
    createAuditTrail(req, {
      actionType,
      actionDetails,
      status: "failed",
      additionalContext: "Invalid OTP",
    });
    return res.status(400).json({
      success: false,
      error,
    });
  }

  user.verification = null;
  user.otpRequired = false;
  await user.save();

  const message = "Verification successful";
  createAuditTrail(req, {
    actionType,
    actionDetails,
    status: "success",
    additionalContext: message,
  });

  return res.status(200).json({
    success: true,
    message,
  });
});

/**
 * Resend OTP
 */
const resendOTP = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  const actionType = ActionType.LOGIN;
  const actionDetails = `resend OTP`;

  if (!user) {
    return res.status(400).json({
      success: false,
      error: "User not found",
    });
  }

  sendOTP({ email: user.email, name: user.username }, req, res);

  createAuditTrail(req, {
    actionType,
    actionDetails,
    status: "success",
    additionalContext: `OTP sent successfully to ${user.email}`,
  });

  return res.status(200).json({
    success: true,
    message:
      " OTP has been sent successfully. Please check your email for the code.",
  });
});

const updateHasOnboard = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(400).json({
      success: false,
      error: "User not found",
    });
  }
  try {
    user.hasOnboard = true;
    await user.save();

    return res
      .status(200)
      .json({ success: true, user, message: "Tutorial ended" });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: "An error occurred",
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
  updateUser,
  uploadBanner,
  updatePassword,
  updateNotificationSettings,
  getUsers,
  firstChangePassword,
  handleUser,
  forgotPassword,
  resetPassword,
  validateResetToken,
  validateOTP,
  resendOTP,
  updateHasOnboard,
};
