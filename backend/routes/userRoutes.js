const { register } = require('../controllers/userController')

const router = require('express').Router()

//Register user
router.post('/register', register)

/**
 * @todo
 * Authenticate user
 */

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