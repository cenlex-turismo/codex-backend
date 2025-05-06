const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/authMiddleware");
const usersController = require("../controllers/usersController");

// User routes
router.post("/createUser", usersController.createUser);
router.post("/authenticateUser", usersController.authenticateUser); // Use POST for authentication
router.post("/logoutUser", usersController.logoutUser); // Use POST for logout
router.get("/validateUserSession", usersController.validateUserSession);
router.put("/updateUser", verifyToken, usersController.updateUser);
router.get("/getUserBasicData", verifyToken, usersController.getUserBasicData);

module.exports = router;