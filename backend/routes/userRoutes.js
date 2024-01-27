const { register, authenticate } = require('../controllers/userController')

const router = require('express').Router()

// Register user
router.post('/register', register)

// Authenticate user
router.post('/login', authenticate)

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
 * Get self
 */

/**
 * @todo
 * Update self
 */


module.exports = router