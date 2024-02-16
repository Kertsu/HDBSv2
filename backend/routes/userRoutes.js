const {
  register,
  authenticate,
  getSelf,
  deleteUser,
  uploadAvatar,
  getNotifications,
  updateSelf,
} = require("../controllers/userController");
const { protect, isAdmin } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/multer");

const router = require("express").Router();

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


// Update self
router.put('/self/update', protect, upload.single("avatar"),updateSelf)


/**
 * @todo
 * Update user
 */


module.exports = router;
