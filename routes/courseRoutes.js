const express = require("express");
const router = express.Router();

const coursesController = require("../controllers/coursesController");

// Course routes
router.post("/createCourse", coursesController.createCourse);
router.get("/getAllCourses", coursesController.getAllCourses);

module.exports = router;