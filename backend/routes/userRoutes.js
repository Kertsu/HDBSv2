const {
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
} = require("../controllers/userController");
const { protect, isAdmin, canHandleReservation, limiter } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/multer");
const { bulkDelete } = require("../utils/helpers");
const User = require("../models/userModel");

const router = require("express").Router();

// Get all users 
router.get("/", canHandleReservation, getUsers);

// Register user
router.post("/register", isAdmin, register);

// Authenticate user
router.post("/login", limiter, authenticate);

// Get self
router.get("/self", protect, getSelf);

// Get self nofitications
router.get("/self/notifications", protect, getNotifications);

// Delete user
router.delete("/:id", isAdmin, deleteUser);

// Upload avatar
router.patch("/self/avatar", protect, upload.single("avatar"), uploadAvatar);

// Upload banner
router.patch("/self/banner", protect, upload.single("banner"), uploadBanner);

// Update self
router.put(
  "/self/update",
  protect,
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  updateSelf
);

// Update receiving email preference
router.patch(
  "/self/update-notification-settings",
  protect,
  updateNotificationSettings
);

// Change password
router.patch("/change-password", protect, updatePassword);

// Reset the user's password
router.patch("/reset-password/:token/:id", resetPassword);

// First change password
router.patch("/onboarding/change-password", protect, firstChangePassword);

// Update a user (admins only)
router.patch("/:id", isAdmin, updateUser);

// Bulk deletion
router.delete("/bulk-delete", isAdmin, bulkDelete(User));

// Disable/enable user
router.patch("/:id/action/:action", isAdmin, handleUser);

// Send a reset password link to the user
router.post("/forgot-password", forgotPassword);

// Check if the token is valid
router.get("/reset-password/validate/:token/:id", validateResetToken);

// Check if OTP is valid
router.post('/otp/validate', protect, validateOTP)

module.exports = router;
