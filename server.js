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

// Initialize Express app
const app = express();

// Middleware
app.use(express.json()); // Parse JSON requests
app.use(cookieParser());
app.use(
    cors({
        origin: "http://148.204.11.20:3001", // Replace with your frontend's URL
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

// Student routes
app.use("/student", verifyToken, studentRoutes);

// Teacher routes
app.use("/teacher", verifyToken, teacherRoutes);

// Course routes
app.use("/course", verifyToken, courseRoutes);

// User routes
app.use("/user", userRoutes);

// Start server
const PORT = process.env.PORT || 3000; // Fallback to port 3000 if not set in .env
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});