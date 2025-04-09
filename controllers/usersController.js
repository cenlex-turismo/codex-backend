const generateToken = require("../utils/generateToken");
const User = require("../models/user");
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const logger = require("../utils/logger"); // Import the logger
const JWT_SECRET = process.env.JWT_SECRET;

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

const validateUserSession = async (req, res) => {
    const token = req.cookies.jwt; // Get token from cookies

    if (!token) {
        logger.warn(`Unauthorized access attempt from IP: ${req.ip}`);
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        const user = await User.findOne({ _id: decoded.userId });
        if (!user) {
            return res.status(401).json({ message: 'Authentication failed. User not found.' });
        }

        logger.info(`User ${decoded.userId} session validated successfully`);

        res.json({
            user: {
                firstName: user.firstName,
                lastName: user.lastName
            }
        });
    } catch (error) {
        console.log(error);
        logger.error(`Invalid token from IP: ${req.ip}`);
        res.status(403).json({ error: "Invalid or expired token" });
    }
};

module.exports = {
    createUser: createUser,
    authenticateUser: authenticateUser,
    logoutUser: logoutUser,
    validateUserSession: validateUserSession
}