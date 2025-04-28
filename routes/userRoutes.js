const express = require("express");
const router = express.Router();

const usersController = require("../controllers/usersController");

// User routes
router.post("/createUser", usersController.createUser);
router.post("/authenticateUser", usersController.authenticateUser); // Use POST for authentication
router.post("/logoutUser", usersController.logoutUser); // Use POST for logout
router.get("/validateUserSession", usersController.validateUserSession);

module.exports = router;