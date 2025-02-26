const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
    language: String,
    level: Number,
    module: Number
});

const Course = mongoose.model('Course', courseSchema);

module.exports = Course;