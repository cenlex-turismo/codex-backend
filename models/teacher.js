const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema({
    firstName: String,
    lastName: String
});

const Teacher = mongoose.model('Teacher', teacherSchema);

module.exports = Teacher;