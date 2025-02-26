const Course = require("../models/course");

const createCourse = async (req, res) => {
    const { language, level, module } = req.body;

    try {
        const course = await Course.create({
            language: language,
            level: level,
            module: module
        });

        res.json({ course: course });
    }
    catch (err) {
        res.status(500).json({ message: 'An error occurred while creating the course', error: err.message });
    }
};

const getAllCourses = async (req, res) => {
    try {
        const courses = await Course.find({});

        res.json({ courses: courses });
    }
    catch (err) {
        res.status(500).json({ message: 'An error occurred while fetching the courses', error: err.message });
    }
};

module.exports = {
    createCourse: createCourse,
    getAllCourses: getAllCourses
}