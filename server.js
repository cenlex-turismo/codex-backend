if (process.env.NODE_ENV != "production") {
    require("dotenv").config()
}

const express = require("express");
const cors = require("cors");
const connectToDb = require("./config/connectToDb");
const studentsController = require("./controllers/studentsController");

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

app.listen(process.env.PORT);