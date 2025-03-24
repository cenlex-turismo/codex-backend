const generateToken = require("../utils/generateToken");
const User = require("../models/user");
const bcrypt = require('bcrypt');

const createUser = async (req, res) => {
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
        });

        res.json({ user: user });
    } catch (err) {
        res.status(500).json({
            message: 'An error occurred while creating the user',
            error: err.message,
        });
    }
};

const authenticateUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Authentication failed. User not found.' });
        }

        // Compare the provided password with the stored hash
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Authentication failed. Invalid password.' });
        }

        generateToken(res, user._id);

        // Authentication successful
        res.json({
            user: {
                firstName: user.firstName,
                lastName: user.lastName
            }
        });
    } catch (err) {
        res.status(500).json({
            message: 'An error occurred while authenticating the user',
            error: err.message
        });
    }
};

const logoutUser = async (req, res) => {
    res.clearCookie('jwt', {
        httpOnly: true,
        secure: true,
        sameSite: 'None'
    });
    res.status(200).json({ message: "Logged out successfully" });
};

module.exports = {
    createUser: createUser,
    authenticateUser: authenticateUser,
    logoutUser: logoutUser
}