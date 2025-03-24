const jwt = require("jsonwebtoken");

const generateToken = (res, userId) => {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: '1d'
    });

    res.cookie('jwt', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
        maxAge: 1000 * 60 * 60 * 24
    });
};

module.exports = generateToken;