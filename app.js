if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

const express = require("express");
const cors = require("cors");
const connectToDb = require("./config/connectToDb");
const cookieParser = require("cookie-parser");
const studentRoutes = require("./routes/studentRoutes");
const courseRoutes = require("./routes/courseRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const userRoutes = require("./routes/userRoutes");
const { verifyToken } = require("./middleware/authMiddleware");
const logger = require("./utils/logger"); // Import logger

// Initialize Express app
const app = express();

// Middleware for logging requests
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url} from ${req.ip}`);
    next();
});

// Middleware
app.use(express.json()); // Parse JSON requests
app.use(cookieParser());
app.use(
    cors({
        origin: "https://codex.celexest.com", // Replace with your frontend's URL
        credentials: true, // Allow credentials (cookies) to be sent
    })
);

// Database connection
connectToDb();

// Default route
app.get("/", (req, res) => {
    res.json({
        message: "Server Alive",
    });
});

// Protected Routes
app.use("/student", verifyToken, studentRoutes);
app.use("/teacher", verifyToken, teacherRoutes);
app.use("/course", verifyToken, courseRoutes);

// User routes (no authentication required for login/signup)
app.use("/user", userRoutes);

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    logger.error(`Error: ${err.message} | Request: ${req.method} ${req.url}`);
    res.status(500).json({ message: "Internal Server Error" });
});

module.exports = app;