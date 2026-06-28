const User = require("../models/User");
const generateToken = require("../utils/generateToken");

const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // check missing fields
        if (!name || !email || !password) {
            return res.status(400).json({
                message: "All fields are required",
            });
        }

        // check existing user
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                message: "User already exists",
            });
        }

        // create user
        const user = await User.create({
            name,
            email,
            password,
        });

        res.status(201).json({
            message: "User registered",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
            },
            token: generateToken(user._id),
        });

    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required",
            });
        }

        const user = await User.findOne({ email });

        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({
                message: "Invalid email or password",
            });
        }

        res.status(200).json({
            message: "Login successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
            },
            token: generateToken(user._id),
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

const getMe = async (req, res) => {
    res.status(200).json({
        user: req.user,
    });
};

module.exports = {
    registerUser,
    loginUser,
    getMe,
};
