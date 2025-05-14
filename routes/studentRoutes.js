const express = require("express");
const router = express.Router();

const studentsController = require("../controllers/studentsController");
const verifyRoles = require("../middleware/verifyRole");

// Student routes
router.get("/getStudent/:id", verifyRoles(["student", "teacher", "admin"]), studentsController.getStudentByIdNumber);
router.put("/registerCourseGrade/:id", verifyRoles(["teacher", "admin"]), studentsController.registerCourseGradeByIdNumber);
router.delete("/maintenance/:id", verifyRoles(["admin"]), studentsController.maintenance);
router.get("/filterStudents", verifyRoles(["teacher", "admin"]), studentsController.filterStudents);
router.get("/generateTranscript", verifyRoles(["teacher", "admin"]), studentsController.generateTranscript);

module.exports = router;