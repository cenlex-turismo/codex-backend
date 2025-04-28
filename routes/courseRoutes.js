const express = require("express");
const router = express.Router();

const coursesController = require("../controllers/coursesController");
const verifyRoles = require("../middleware/verifyRole");

// Course routes
router.post("/createCourse", verifyRoles(["teacher", "admin"]), coursesController.createCourse);
router.get("/getAllCourses", verifyRoles(["teacher", "admin"]), coursesController.getAllCourses);

module.exports = router;