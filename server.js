if (process.env.NODE_ENV != "production") {
    require("dotenv").config()
}

const express = require("express");
const cors = require("cors");
const connectToDb = require("./config/connectToDb");
const studentsController = require("./controllers/studentsController");
const teachersController = require("./controllers/teachersController");
const coursesController = require("./controllers/coursesController");
const usersController = require("./controllers/usersController");

const app = express();
app.use(express.json());
app.use(cors());
connectToDb();

app.get('/', (req, res) => {
    res.json({
        hello: "World"
    })
});

app.post('/createStudent', studentsController.createStudent);

app.get('/getStudent/:id', studentsController.getStudentByIdNumber);

app.put('/registerCourseGrade/:id', studentsController.registerCourseGradeByIdNumber);

app.delete('/maintenance', studentsController.maintenance);

app.get('/filterStudents', studentsController.filterStudents);

app.post('/createTeacher', teachersController.createTeacher);

app.get('/getAllTeachers', teachersController.getAllTeachers);

app.post('/createCourse', coursesController.createCourse);

app.get('/getAllCourses', coursesController.getAllCourses);

app.post('/createUser', usersController.createUser);

app.listen(process.env.PORT);