const User = require("../models/user");
const bcrypt = require('bcrypt');

const createTeacher = async (req, res) => {
    const { email, password, firstName, lastName } = req.body;

    try {
        // Generate a secure hash for the password
        const saltRounds = 10; // Number of salt rounds for bcrypt
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Create the user in the database
        const user = await User.create({
            email: email,
            passwordHash: passwordHash,
            firstName: firstName,
            lastName: lastName,
            role: "teacher"
        });

        res.json({ teacher: user });
    }
    catch (err) {
        res.status(500).json({ message: 'An error occurred while creating the teacher', error: err.message });
    }
};

const getAllTeachers = async (req, res) => {
    try {
        const teachers = await User.find({ role: "teacher" });

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