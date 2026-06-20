const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const createToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

exports.register = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ status: 'fail', message: 'Fields required' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ username, password: hashedPassword });

        const token = createToken(user._id);
        res.cookie('token', token, { httpOnly: true });

        res.status(201).json({ status: 'success', username: user.username });
    } catch (err) {
        res.status(400).json({ status: 'error', message: 'Registration failed' });
    }
};

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (user && (await bcrypt.compare(password, user.password))) {
            const token = createToken(user._id);
            res.cookie('token', token, { httpOnly: true });

            res.status(200).json({ status: 'success', username: user.username });
        } else {
            res.status(401).json({ status: 'error', message: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};