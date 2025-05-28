const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  idNumber: { type: Number, unique: true },
  courseGrades: [{
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    courseType: String,
    score: Number,
    courseStart: Date,
    courseEnd: Date,
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
  }],
  lastModified: Date
});

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;