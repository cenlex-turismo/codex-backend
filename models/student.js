const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: { type: String, unique: true },
    courseGrades: [{
        level: Number,
        module: Number,
        score: Number
      }
    ],
    lastModified: Date
  });

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;