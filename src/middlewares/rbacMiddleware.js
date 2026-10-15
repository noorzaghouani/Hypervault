'use strict';
const AuditService = require('../services/auditService');

const requireRole = (...roles) => async (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        await AuditService.log({
            action   : 'UNAUTHORIZED_ACCESS',
            userId   : req.user?.id || null,
            details  : { endpoint: req.originalUrl, required: roles, userRole: req.user?.role },
            ip       : req.ip,
            userAgent: req.headers['user-agent'],
            success  : false
        });
        return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    next();
};

module.exports = { requireRole };
