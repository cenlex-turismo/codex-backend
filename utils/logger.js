const winston = require("winston");
const path = require("path");

// Define log file paths
const logsDirectory = path.join(__dirname, "..", "logs");

const logger = winston.createLogger({
    level: "info", // Log level (info, error, debug, etc.)
    format: winston.format.combine(
        winston.format.timestamp({ format: "DD-MM-YYYY HH:mm:ss.SSS UTC" }),
        winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}]: ${message}`)
    ),
    transports: [
        new winston.transports.Console(), // Log to console
        new winston.transports.File({ filename: path.join(logsDirectory, "server.log") }) // Log to file
    ],
});

module.exports = logger;
