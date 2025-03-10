const { query } = require("express");
const Student = require("../models/student");

const createStudent = async (req, res) => {
    const { firstName, lastName, studentType } = req.body;
    var { idNumber } = req.body;

    try {

        if (studentType === '2') {
            do {
                idNumber = Math.floor(3000000000 + Math.random() * 1000000000);
                var existingStudent = await Student.findOne({ idNumber });
            } while (existingStudent);
        } else {
            const existingStudent = await Student.findOne({ idNumber });
            if (existingStudent) {
                return res.status(400).json({ message: 'Student with this ID already exists' });
            }
        }

        const currentDate = new Date();

        const student = await Student.create({
            idNumber: idNumber,
            firstName: firstName,
            lastName: lastName,
            lastModified: currentDate
        });

        res.json({ student: student });
    }
    catch (err) {
        console.log(err)
        res.status(500).json({ message: 'An error occurred while creating the student', error: err.message });
    }
};

const getStudentByIdNumber = async (req, res) => {
    try {
        const idNumber = req.params.id;

        // Find the student by email
        const student = await Student.findOne({ idNumber })
            .populate('courseGrades.course')
            .populate('courseGrades.teacher')
            .exec();

        // Check if student exists
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Return the found student
        res.status(200).json({ student });
    } catch (err) {
        // Handle errors
        res.status(500).json({ message: 'An error occurred while retrieving the student', error: err.message });
    }
};

const registerCourseGradeByIdNumber = async (req, res) => {
    try {
        const idNumber = req.params.id;
        const { course, score, courseStart, courseEnd, teacher } = req.body;

        // Find the student by email
        const student = await Student.findOne({ idNumber: idNumber });

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Check if the course already exists in the courseGrades array
        const existingGradeIndex = student.courseGrades.findIndex(grade => grade.course == course);

        if (existingGradeIndex !== -1) {
            // If the course already exists, update the score
            student.courseGrades[existingGradeIndex] = {
                course: course,
                score: score,
                courseStart: courseStart,
                courseEnd: courseEnd,
                teacher: teacher
            };
        } else {
            // If the course does not exist, add a new entry
            student.courseGrades.push({
                course: course,
                score: score,
                courseStart: courseStart,
                courseEnd: courseEnd,
                teacher: teacher
            });
        }

        // Update the student document in the database
        const currentDate = new Date();
        const studentUpdated = await Student.findOneAndUpdate({ idNumber: idNumber }, {
            $set: {
                courseGrades: student.courseGrades,
                lastModified: currentDate
            }
        }, { new: true });

        res.json(studentUpdated);

    } catch (error) {
        res.status(500).json({ message: "An error occurred", error });
    }
};

const maintenance = async (req, res) => {
    try {
        // Get the current date
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

        // Delete documents where lastModified is older than two years
        const result = await Student.deleteMany({
            lastModified: { $lt: twoYearsAgo }
        });

        res.json({ message: `Deleted ${result.deletedCount} entries older than two years` });
    } catch (err) {
        // Handle errors
        res.status(500).json({ message: "An error occurred during maintenance", error: err.message });
    }
};

const filterStudents = async (req, res) => {
    try {
        const { idNumber, firstName, lastName, course, score, scoreCondition, courseStart, courseStartCondition, courseEnd, courseEndCondition, teacher } = req.query;
        const query = {};

        // Handle partial match for idNumber
        if (idNumber !== "") {
            query.$expr = {
                $regexMatch: {
                    input: { $toString: "$idNumber" }, // Cast idNumber to a string
                    regex: idNumber,
                    options: "i", // Case-insensitive
                },
            };
        }

        // Handle partial match for firstName
        if (firstName !== "") {
            query.firstName = { $regex: firstName, $options: 'i' }; // Case-insensitive partial match
        }

        // Handle partial match for lastName
        if (lastName !== "") {
            query.lastName = { $regex: lastName, $options: 'i' }; // Case-insensitive partial match
        }

        if (course !== "") query.course = course;
        if (teacher !== "") query.teacher = teacher;

        // Handle score condition
        if (score !== "") {
            switch (scoreCondition) {
                case 'equal':
                    query.score = { $eq: score };
                    break;
                case 'greater':
                    query.score = { $gt: score };
                    break;
                case 'less':
                    query.score = { $lt: score };
                    break;
                default:
                    query.score = score; // Default to exact match if no condition is provided
            }
        }

        // Handle courseStart condition
        if (courseStart !== "") {
            switch (courseStartCondition) {
                case 'equal':
                    query.courseStart = { $eq: new Date(courseStart) };
                    break;
                case 'greater':
                    query.courseStart = { $gt: new Date(courseStart) };
                    break;
                case 'less':
                    query.courseStart = { $lt: new Date(courseStart) };
                    break;
                default:
                    query.courseStart = new Date(courseStart); // Default to exact match if no condition is provided
            }
        }

        // Handle courseEnd condition
        if (courseEnd !== "") {
            switch (courseEndCondition) {
                case 'equal':
                    query.courseEnd = { $eq: new Date(courseEnd) };
                    break;
                case 'greater':
                    query.courseEnd = { $gt: new Date(courseEnd) };
                    break;
                case 'less':
                    query.courseEnd = { $lt: new Date(courseEnd) };
                    break;
                default:
                    query.courseEnd = new Date(courseEnd); // Default to exact match if no condition is provided
            }
        }

        // Find the student by email
        const students = await Student.find(query);

        // Check if student exists
        if (!students.length) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Return the found student
        res.status(200).json({ students: students });
    } catch (err) {
        // Handle errors
        console.log(err)
        res.status(500).json({ message: 'An error occurred while retrieving the student', error: err.message });
    }
};

module.exports = {
    createStudent: createStudent,
    getStudentByIdNumber: getStudentByIdNumber,
    registerCourseGradeByIdNumber: registerCourseGradeByIdNumber,
    maintenance: maintenance,
    filterStudents: filterStudents
}