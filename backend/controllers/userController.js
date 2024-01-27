const asyncHandler = require('express-async-handler');
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const register = asyncHandler (async (req, res) => {
    res.send({message: 'register'})
})

module.exports = {register}