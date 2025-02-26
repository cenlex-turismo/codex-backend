const Teacher = require("../models/teacher");

const createTeacher = async (req, res) => {
    const { firstName, lastName } = req.body;

    try {
        const teacher = await Teacher.create({
            firstName: firstName,
            lastName: lastName,
        });

        res.json({ teacher: teacher });
    }
    catch (err) {
        res.status(500).json({ message: 'An error occurred while creating the teacher', error: err.message });
    }
};

const getAllTeachers = async (req, res) => {
    try {
        const teachers = await Teacher.find({});

        res.json({ teachers: teachers });
    }
    catch (err) {
        res.status(500).json({ message: 'An error occurred while fetching the teachers', error: err.message });
    }
};

module.exports = {
    createTeacher: createTeacher,
    getAllTeachers: getAllTeachers
}