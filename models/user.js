const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    email: { type: String, unique: true },
    passwordHash: { type: String, unique: true },
    firstName: String,
    lastName: String
});

const User = mongoose.model('User', userSchema);

module.exports = User;