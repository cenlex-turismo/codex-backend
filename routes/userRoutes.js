const express = require("express");
const router = express.Router();

const usersController = require("../controllers/usersController");

// Teacher routes
router.post("/createUser", usersController.createUser);
router.post("/authenticateUser", usersController.authenticateUser); // Use POST for authentication

module.exports = router;