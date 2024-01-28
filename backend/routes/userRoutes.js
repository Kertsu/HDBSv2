const {
  register,
  authenticate,
  getSelf,
  deleteUser,
  uploadAvatar,
} = require("../controllers/userController");
const { protect, isAdmin } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/multer");

const userRoutesSetup = (io) =>{

const router = require("express").Router();

  // Register user
  router.post("/register", register);

  // Authenticate user
  router.post("/login", authenticate);

  // Get self
  router.get("/self", protect, getSelf);

  // Delete user
  router.delete("/delete/:id", isAdmin, deleteUser);

  // Upload avatar
  router.put("/self/avatar", protect, upload.single("avatar"), uploadAvatar);

  return router;
}

/**
 * @todo
 * Update user
 */

/**
 * @todo
 * Update self
 */

module.exports = userRoutesSetup;
