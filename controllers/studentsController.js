const Student = require("../models/student");

const createStudent = async (req, res) => {
    const {firstName ,lastName , email} = req.body;

    try {

        const existingStudent = await Student.findOne({ email });
        if (existingStudent) {
            return res.status(400).json({ message: 'Student with this email already exists' });
        }

        const currentDate = new Date();

        const student = await Student.create({
            firstName: firstName,
            lastName: lastName,
            email: email,
            lastModified: currentDate
        });

        res.json({ student: student });
    }
    catch(err){
        res.status(500).json({ message: 'An error occurred while creating the student', error: err.message });
    }
};

const getStudentByEmail = async (req, res) => {
    try {
        const email = req.params.id;

        // Find the student by email
        const student = await Student.findOne({ email });

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

const registerCourseGradeByEmail = async(req, res) => {
    try {
        const email = req.params.id;
        const { level, module, score } = req.body;

        // Find the student by email
        const student = await Student.findOne({ email: email });

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Check if the course already exists in the courseGrades array
        const existingGradeIndex = student.courseGrades.findIndex(grade => grade.level == level && grade.module == module);

        if (existingGradeIndex !== -1) {
            // If the course already exists, update the score
            student.courseGrades[existingGradeIndex].score = score;
        } else {
            // If the course does not exist, add a new entry
            student.courseGrades.push({
                level: level,
                module: module,
                score: score
            });
        }

        // Update the student document in the database
        const currentDate = new Date();
        const studentUpdated = await Student.findOneAndUpdate({ email: email }, {
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

module.exports = {
    createStudent: createStudent,
    getStudentByEmail: getStudentByEmail,
    registerCourseGradeByEmail: registerCourseGradeByEmail,
    maintenance: maintenance
}