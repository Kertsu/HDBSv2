const {
  register,
  authenticate,
  getSelf,
  deleteUser,
  uploadAvatar,
  getNotifications,
  updateSelf,
  updateRole,
  uploadBanner,
  updatePassword,
  updateNotificationSettings,
  getUsers,
} = require("../controllers/userController");
const { protect, isAdmin } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/multer");

const router = require("express").Router();

// Get all users (Admin only)
router.get('/', isAdmin, getUsers)

// Register user
router.post("/register", register);

// Authenticate user
router.post("/login", authenticate);

// Get self
router.get("/self", protect, getSelf);

// Get self nofitications
router.get('/self/notifications', protect, getNotifications)

// Delete user
router.delete("/:id", isAdmin, deleteUser);

// Upload avatar
router.put("/self/avatar", protect, upload.single("avatar"), uploadAvatar);

// Upload banner
router.put("/self/banner", protect, upload.single("banner"), uploadBanner);

// Update self
router.put('/self/update', protect, upload.single("avatar"),updateSelf)

// Update receiving email preference
router.patch('/self/update_notification_settings', protect, updateNotificationSettings)

// Change password
router.put('/change_password', protect, updatePassword)

// Update role (admins only)
router.put('/:id', isAdmin, updateRole)


/**
 * @TODO
 * forgot password
 * reset password
 */


module.exports = router;
