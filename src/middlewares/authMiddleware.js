'use strict';
const jwt          = require('jsonwebtoken');
const SessionModel = require('../models/sessionModel');

const COOKIE_CLEAR_OPTIONS = {
    httpOnly: true,
    sameSite: 'strict',
    secure  : true
};

const requireAuth = async (req, res, next) => {
    const token = req.cookies?.jwt;
    if (!token) return res.status(401).json({ error: 'Authentication required. Please log in.' });

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const session = await SessionModel.findByToken(token);
        if (!session) {
            res.clearCookie('jwt', COOKIE_CLEAR_OPTIONS);
            return res.status(401).json({ error: 'Session expired. Please log in again.' });
        }
        req.user = payload;
        next();
    } catch {
        res.clearCookie('jwt', COOKIE_CLEAR_OPTIONS);
        res.status(401).json({ error: 'Invalid or expired session.' });
    }
};

module.exports = { requireAuth };
