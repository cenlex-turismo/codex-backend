const express = require("express");
const router = express.Router();

const teachersController = require("../controllers/teachersController");
const verifyRoles = require("../middleware/verifyRole");

// Teacher routes
router.post("/createTeacher", verifyRoles(["admin"]), teachersController.createTeacher);
router.get("/getAllTeachers", verifyRoles(["teacher", "admin"]), teachersController.getAllTeachers);

module.exports = router;