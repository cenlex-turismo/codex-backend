const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true },
    passwordHash: { type: String, required: true },
    firstName: String,
    lastName: String,
    role: { type: String, enum: ["admin", "teacher", "student"], default: "student" },
    studentDetails: { type: mongoose.Schema.Types.ObjectId, ref: "Student" }
});

const User = mongoose.model('User', userSchema);

module.exports = User;