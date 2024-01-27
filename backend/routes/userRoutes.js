const { register, authenticate, getSelf, deleteUser } = require('../controllers/userController')
const { protect, isAdmin } = require('../middlewares/authMiddleware')

const router = require('express').Router()

// Register user
router.post('/register', register)

// Authenticate user
router.post('/login', authenticate)

// Get self
router.get('/self', protect, getSelf)

// Delete user
router.delete('/delete/:id', isAdmin, deleteUser)


/**
 * @todo
 * Delete user
 */

/**
 * @todo
 * Update user
 */


/**
 * @todo
 * Update self
 */


module.exports = router