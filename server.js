// Start server
const PORT = process.env.PORT || 3000; // Fallback to port 3000 if not set in .env
const app = require("./app");

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});