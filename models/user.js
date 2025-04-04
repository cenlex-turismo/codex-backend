const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    email: { type: String, unique: true },
    passwordHash: String,
    firstName: String,
    lastName: String
});

const User = mongoose.model('User', userSchema);

module.exports = User;