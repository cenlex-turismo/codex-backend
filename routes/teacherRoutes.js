const express = require("express");
const router = express.Router();

const teachersController = require("../controllers/teachersController");

// Teacher routes
router.post("/createTeacher", teachersController.createTeacher);
router.get("/getAllTeachers", teachersController.getAllTeachers);

module.exports = router;