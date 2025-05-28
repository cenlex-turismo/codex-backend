require("dotenv").config()

const mongoose = require("mongoose");

async function connectToDb() {
    const dbUrl = process.env.NODE_ENV === "production" ? process.env.DB_URL_P : process.env.DB_URL_T;

    try {
        await mongoose.connect(dbUrl);
        console.log("Connected to DB");
    }
    catch (err) {
        console.log(err);
    }
}

module.exports = connectToDb;