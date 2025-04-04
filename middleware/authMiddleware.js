const jwt = require("jsonwebtoken");
const logger = require("../utils/logger"); // Import the logger
const JWT_SECRET = process.env.JWT_SECRET;

exports.verifyToken = (req, res, next) => {
    const token = req.cookies.jwt; // Get token from cookies

    if (!token) {
        logger.warn(`Unauthorized access attempt from IP: ${req.ip}`);
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Attach user info to request
        logger.info(`User ${decoded.userId} authenticated successfully`);
        next();
    } catch (error) {
        logger.error(`Invalid token from IP: ${req.ip}`);
        res.status(403).json({ error: "Invalid or expired token" });
    }
};