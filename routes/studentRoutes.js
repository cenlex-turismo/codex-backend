const express = require("express");
const router = express.Router();

const studentsController = require("../controllers/studentsController");

// Student routes
router.post("/createStudent", studentsController.createStudent);
router.get("/getStudent/:id", studentsController.getStudentByIdNumber);
router.put("/registerCourseGrade/:id", studentsController.registerCourseGradeByIdNumber);
router.delete("/maintenance", studentsController.maintenance);
router.get("/filterStudents", studentsController.filterStudents);

module.exports = router;