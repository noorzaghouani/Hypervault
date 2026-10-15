'use strict';
const crypto = require('crypto');

/**
 * Enterprise CSRF Protection Middleware
 * Employs Double-Submit Cookie pattern with Cryptographically Secure timingSafeEqual comparison.
 * Supports JSON REST API and React client headers.
 */
function csrfProtection(req, res, next) {
    let token = req.cookies?._csrf;

    if (!token || typeof token !== 'string' || token.length !== 64) {
        token = crypto.randomBytes(32).toString('hex');
        res.cookie('_csrf', token, {
            httpOnly: true,
            sameSite: 'strict',
            secure  : true   // server always runs HTTPS
        });
    }

    res.locals.csrfToken = token;

    // For safe idempotent HTTP methods, proceed
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    // Verify token on state-changing requests
    const submittedToken = req.body?._csrf || req.headers?.['x-csrf-token'] || req.headers?.['csrf-token'];

    if (!submittedToken || typeof submittedToken !== 'string') {
        return res.status(403).json({
            error: 'Access Forbidden: Missing CSRF security token. Please refresh the page.'
        });
    }

    try {
        const bufSubmitted = Buffer.from(submittedToken);
        const bufExpected  = Buffer.from(token);

        if (bufSubmitted.length !== bufExpected.length || !crypto.timingSafeEqual(bufSubmitted, bufExpected)) {
            return res.status(403).json({
                error: 'Access Forbidden: Invalid CSRF security token.'
            });
        }
    } catch {
        return res.status(403).json({
            error: 'Access Forbidden: Invalid CSRF security token.'
        });
    }

    next();
}

module.exports = csrfProtection;
