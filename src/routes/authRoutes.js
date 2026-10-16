'use strict';
const express        = require('express');
const router         = express.Router();
const rateLimit      = require('express-rate-limit');
const { requireAuth }    = require('../middlewares/authMiddleware');
const authController     = require('../controllers/authController');
const webAuthnController = require('../controllers/webAuthnController');
const { requirePendingAuth } = webAuthnController;

const loginLimiter = rateLimit({
    windowMs: 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ error: 'Too many login attempts. Please wait 1 minute.' })
});

const passwordLimiter = rateLimit({
    windowMs: 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ error: 'Too many password change attempts.' })
});

const webAuthnLimiter = rateLimit({
    windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ error: 'Too many WebAuthn requests.' })
});

// ── Authentification classique ────────────────────────────────────────────────
router.post('/login',           loginLimiter,                          authController.login);
router.post('/logout',          requireAuth,                           authController.logout);
router.get('/me',               requireAuth,                           authController.me);
router.post('/change-password', requireAuth, passwordLimiter,          authController.changePassword);

// ── WebAuthn — Enregistrement (utilisateur connecté) ─────────────────────────
router.post('/webauthn/register-options', requireAuth,     webAuthnLimiter, webAuthnController.registerOptions);
router.post('/webauthn/register-verify',  requireAuth,     webAuthnLimiter, webAuthnController.registerVerify);
router.get('/webauthn/status',            requireAuth,                       webAuthnController.status);
router.delete('/webauthn/remove',         requireAuth,                       webAuthnController.remove);

// ── WebAuthn — Login MFA (après validation du mot de passe) ──────────────────
router.post('/webauthn/login-options', requirePendingAuth, webAuthnLimiter, webAuthnController.loginOptions);
router.post('/webauthn/login-verify',  requirePendingAuth, webAuthnLimiter, webAuthnController.loginVerify);

module.exports = router;

