const User = require("../models/user");

const createUser = async (req, res) => {
    const { email, passwordHash, firstName, lastName } = req.body;

    try {
        const user = await User.create({
            email: email,
            passwordHash: passwordHash,
            firstName: firstName,
            lastName: lastName
        });

        res.json({ user: user });
    }
    catch (err) {
        res.status(500).json({ message: 'An error occurred while creating the user', error: err.message });
    }
};

module.exports = {
    createUser: createUser
}