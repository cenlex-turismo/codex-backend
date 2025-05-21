const { query } = require("express");
const Student = require("../models/student");
const User = require("../models/user");
const bcrypt = require('bcrypt');
const docx = require("docx");

const { Document, Packer, Paragraph, TextRun } = docx;

const createStudent = async (req, res) => {
    const { firstName, lastName, email, password, studentType } = req.body;
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
            lastModified: currentDate
        });

        const saltRounds = 10; // Number of salt rounds for bcrypt
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const user = await User.create({
            email: email,
            passwordHash: passwordHash,
            firstName: firstName,
            lastName: lastName,
            role: "student",
            studentDetails: student._id
        });

        res.json({ idNumber: idNumber });
    }
    catch (err) {
        console.log(err)
        res.status(500).json({ message: 'An error occurred while creating the student', error: err.message });
    }
};

const getStudentByIdNumber = async (req, res) => {
    try {
        const idNumber = req.params.id;

        // First, find the student by idNumber
        const student = await Student.findOne({ idNumber });

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Then find the user who references that student
        const user = await User.findOne({ studentDetails: student._id })
            .populate({
                path: 'studentDetails',
                populate: [
                    { path: 'courseGrades.course' },
                    { path: 'courseGrades.teacher' }
                ]
            })
            .exec();

        if (!user) {
            return res.status(404).json({ message: 'User with this student not found' });
        }

        // Return the found user
        res.status(200).json({ student: user, allowDownload: req.user.role !== "student" });
    } catch (err) {
        res.status(500).json({ message: 'An error occurred while retrieving the student', error: err.message });
    }
};


const registerCourseGradeByIdNumber = async (req, res) => {
    try {
        const idNumber = req.params.id;
        const { course, score, courseStart, courseEnd, teacher } = req.body;

        // Find the student by idNumber
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
    const years = parseInt(req.params.id, 10);

    try {
        const yearsAgo = new Date();
        yearsAgo.setFullYear(yearsAgo.getFullYear() - years);

        // Find students to be deleted
        const studentsToDelete = await Student.find({
            lastModified: { $lt: yearsAgo }
        });

        const studentIds = studentsToDelete.map(student => student._id);

        // Delete related users
        const userResult = await User.deleteMany({
            studentDetails: { $in: studentIds }
        });

        // Delete the students
        const studentResult = await Student.deleteMany({
            _id: { $in: studentIds }
        });

        res.json({
            message: `Deleted ${studentResult.deletedCount} student(s) and ${userResult.deletedCount} related user(s) older than ${years} year(s).`
        });
    } catch (err) {
        res.status(500).json({
            message: "An error occurred during maintenance",
            error: err.message
        });
    }
};

const filterStudents = async (req, res) => {
    try {
        const { idNumber, firstName, lastName, course, score, scoreCondition, courseStart, courseStartCondition, courseEnd, courseEndCondition, teacher } = req.query;

        // Build the student query
        const studentQuery = {};

        if (idNumber !== "") {
            studentQuery.$expr = {
                $regexMatch: {
                    input: { $toString: "$idNumber" },
                    regex: idNumber,
                    options: "i",
                },
            };
        }

        // Build courseGrades query
        const courseGradesQuery = {};

        if (course !== "") {
            courseGradesQuery.course = course;
        }

        if (score !== "") {
            switch (scoreCondition) {
                case "equal":
                    courseGradesQuery.score = { $eq: Number(score) };
                    break;
                case "greater":
                    courseGradesQuery.score = { $gt: Number(score) };
                    break;
                case "less":
                    courseGradesQuery.score = { $lt: Number(score) };
                    break;
                default:
                    courseGradesQuery.score = Number(score);
            }
        }

        if (courseStart !== "") {
            switch (courseStartCondition) {
                case "equal":
                    courseGradesQuery.courseStart = { $eq: new Date(courseStart) };
                    break;
                case "greater":
                    courseGradesQuery.courseStart = { $gt: new Date(courseStart) };
                    break;
                case "less":
                    courseGradesQuery.courseStart = { $lt: new Date(courseStart) };
                    break;
                default:
                    courseGradesQuery.courseStart = new Date(courseStart);
            }
        }

        if (courseEnd !== "") {
            switch (courseEndCondition) {
                case "equal":
                    courseGradesQuery.courseEnd = { $eq: new Date(courseEnd) };
                    break;
                case "greater":
                    courseGradesQuery.courseEnd = { $gt: new Date(courseEnd) };
                    break;
                case "less":
                    courseGradesQuery.courseEnd = { $lt: new Date(courseEnd) };
                    break;
                default:
                    courseGradesQuery.courseEnd = new Date(courseEnd);
            }
        }

        if (teacher !== "") {
            courseGradesQuery.teacher = teacher;
        }

        if (Object.keys(courseGradesQuery).length > 0) {
            studentQuery.courseGrades = { $elemMatch: courseGradesQuery };
        }

        // Find students matching the studentQuery
        const students = await Student.find(studentQuery);

        // Get the IDs of the matching students
        const studentIds = students.map(student => student._id);

        // Now build the User query
        const userQuery = !students.length ? {
            role: "student"
        } : {
            role: "student",
            studentDetails: { $in: studentIds }
        }

        if (firstName !== "") {
            userQuery.firstName = { $regex: firstName, $options: 'i' };
        }

        if (lastName !== "") {
            userQuery.lastName = { $regex: lastName, $options: 'i' };
        }

        // Find users matching the userQuery and populate the studentDetails
        const users = await User.find(userQuery)
            .populate('studentDetails')
            .exec();

        if (!users.length) {
            return res.status(404).json({ message: 'No users found matching the given criteria' });
        }

        res.status(200).json({ students: users });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'An error occurred while filtering students', error: err.message });
    }
};

const generateTranscript = async (req, res) => {
    try {
        // Extract the student ID from the request parameters
        const idNumber = req.params.id;

        // Fetch student data
        const student = await Student.findOne({ idNumber }).populate({
            path: "courseGrades.course",
            model: "Course",
        });

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Fetch user data for the student
        const user = await User.findOne({ studentDetails: student._id });

        if (!user) {
            return res.status(404).json({ message: "User data for student not found" });
        }

        // Create the document
        const doc = new Document({
            creator: "CELEX",
            title: "Historial Académico",
            description: "Transcripción de cursos y calificaciones",
            sections: []
        });

        // Header section
        doc.addSection({
            children: [
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "Secretaría Académica\nDirección de Educación Superior\nEscuela Superior de Turismo",
                            bold: true,
                        }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "\nFolio: CELEXEST-HAIXXX-2025\n", bold: true }),
                    ],
                }),
                new Paragraph({
                    children: [new TextRun({ text: "Asunto: Historial Académico\n\nA QUIEN CORRESPONDA:\n\n" })],
                }),
            ],
        });

        // Dynamic student data
        doc.addSection({
            children: [
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `Con base en la documentación que obra en los expedientes, se hace constar que el C. ${user.firstName} ${user.lastName} con número de boleta ${student.idNumber} concluyó los estudios como se detalla a continuación:\n\n`,
                        }),
                    ],
                }),
            ],
        });

        // Add courses dynamically
        student.courseGrades.forEach((grade) => {
            doc.addSection({
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `Curso: ${grade.course.language} | Nivel: ${grade.course.level} | Calificación: ${grade.score} | Periodo: ${new Date(grade.courseStart).toLocaleDateString()} - ${new Date(grade.courseEnd).toLocaleDateString()}\n`,
                            }),
                        ],
                    }),
                ],
            });
        });

        // Footer section
        doc.addSection({
            children: [
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "ATENTAMENTE\n\nLIC. NAYELI SERRANO FERNÁNDEZ\nSUBDIRECTORA DE SERVICIOS EDUCATIVOS\n\n",
                            bold: true,
                        }),
                    ],
                }),
            ],
        });

        // Generate and send the Word document
        const buffer = await Packer.toBuffer(doc);
        res.setHeader("Content-Disposition", "attachment; filename=transcript.docx");
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        res.send(buffer);
    } catch (error) {
        console.error("Error generating transcript:", error);
        res.status(500).json({ message: "An error occurred while generating the transcript." });
    }
};

module.exports = {
    createStudent: createStudent,
    getStudentByIdNumber: getStudentByIdNumber,
    registerCourseGradeByIdNumber: registerCourseGradeByIdNumber,
    maintenance: maintenance,
    filterStudents: filterStudents,
    generateTranscript: generateTranscript
}