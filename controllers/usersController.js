const generateToken = require("../utils/generateToken");
const User = require("../models/user");
const Student = require("../models/student");
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
            role: "admin"
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

        generateToken(res, user._id, user.role);

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

        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ message: 'Authentication failed. User not found.' });
        }

        logger.info(`User ${decoded.userId} session validated successfully`);

        let idNumber = 0;
        if(decoded.role == "student"){
            const studentDetails = await Student.findById(user.studentDetails);
            idNumber = studentDetails.idNumber;
        }

        res.json({
            user: {
                firstName: user.firstName,
                lastName: user.lastName,
                role: decoded.role,
                idNumber: idNumber
            }
        });
    } catch (error) {
        console.log(error);
        logger.error(`Invalid token from IP: ${req.ip}`);
        res.status(403).json({ error: "Invalid or expired token" });
    }
};

const updateUser = async (req, res) => {
    const { currentPassword, password, firstName, lastName } = req.body;

    try {
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verificar la contraseña actual
        const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid current password' });
        }

        if (password && password.trim() !== "") {
            const saltRounds = 10;
            user.passwordHash = await bcrypt.hash(password, saltRounds);
        }

        if (firstName && firstName.trim() !== "") {
            user.firstName = firstName;
        }

        if (lastName && lastName.trim() !== "") {
            user.lastName = lastName;
        }

        await user.save();

        res.json({ message: 'User updated successfully', user });
    } catch (err) {
        res.status(500).json({
            message: 'An error occurred while updating the user',
            error: err.message,
        });
    }
};

const getUserBasicData = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            userData: {
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email
            }
        });
    } catch (err) {
        res.status(500).json({
            message: 'An error occurred while fecthing the user',
            error: err.message,
        });
    }
};

module.exports = {
    createUser: createUser,
    authenticateUser: authenticateUser,
    logoutUser: logoutUser,
    validateUserSession: validateUserSession,
    updateUser: updateUser,
    getUserBasicData: getUserBasicData
}