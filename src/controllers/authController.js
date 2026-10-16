'use strict';
const jwt               = require('jsonwebtoken');
const UserModel         = require('../models/userModel');
const SessionModel      = require('../models/sessionModel');
const AuditService      = require('../services/auditService');
const CryptoService     = require('../services/cryptoService');
const ValidationService = require('../services/validationService');
const WebAuthnModel     = require('../models/webAuthnModel');

const LOCKOUT_THRESHOLD = 5;

// Dummy Argon2id hash used to normalize response time when user doesn't exist
// (prevents timing-based account enumeration)
const DUMMY_HASH = '$argon2id$v=19$m=65536,t=3,p=4$dummysaltdummysalt$dummyhash00000000000000000000000000000000000000000000';

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure  : true,   // server always runs HTTPS
    sameSite: 'strict',
    maxAge  : 24 * 60 * 60 * 1000
};

const getIp = (req) => req.ip || req.connection?.remoteAddress || 'unknown';
const getUA = (req) => req.headers['user-agent'] || 'unknown';

// ── POST /api/auth/login ──────────────────────────────────────────────────────
const login = async (req, res) => {
    const ip         = getIp(req);
    const ua         = getUA(req);
    const identifier = ValidationService.sanitize(req.body.email || req.body.username || req.body.identifier || '');
    const pwd        = req.body.password || '';

    if (!identifier || !pwd) {
        return res.status(400).json({ error: 'Please enter your corporate email or username and password.' });
    }

    const user = await UserModel.findByIdentifier(identifier);

    if (!user || !user.is_active) {
        // Run dummy verify to match timing of a real Argon2id check (anti-enumeration)
        await CryptoService.verifyPassword(pwd, DUMMY_HASH).catch(() => {});
        await AuditService.log({ action: 'LOGIN_FAILED', ip, userAgent: ua, details: { identifier }, success: false });
        return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
        const mins = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
        await AuditService.log({ action: 'ACCOUNT_LOCKED_ATTEMPT', userId: user.id, ip, userAgent: ua, success: false });
        return res.status(423).json({ error: `Account locked. Try again in ${mins} minute(s).` });
    }

    const valid = await CryptoService.verifyPassword(pwd, user.password_hash);
    if (!valid) {
        const attempts = await UserModel.incrementFailedAttempts(user.id);
        await AuditService.log({ action: 'LOGIN_FAILED', userId: user.id, details: { attempts }, ip, userAgent: ua, success: false });
        if (attempts >= LOCKOUT_THRESHOLD) {
            await UserModel.lockAccount(user.id);
            await AuditService.log({ action: 'ACCOUNT_LOCKED', userId: user.id, ip, userAgent: ua, success: false });
            return res.status(423).json({ error: 'Account locked after 5 failed attempts. Try again in 15 minutes.' });
        }
        return res.status(401).json({ error: 'Invalid credentials.' });
    }

    await UserModel.resetFailedAttempts(user.id);

    // Automatic migration bcrypt → Argon2id
    if (CryptoService.needsRehash(user.password_hash)) {
        try {
            const newHash = await CryptoService.hashPassword(pwd);
            await UserModel.updatePassword(user.id, newHash);
        } catch {}
    }

    // ── WebAuthn Gate : si l'utilisateur a une empreinte enregistrée ──────────
    const hasPasskey = await WebAuthnModel.hasCredentials(user.id);
    if (hasPasskey) {
        // Émettre un token temporaire (2 min) pour la phase WebAuthn
        const pendingToken = jwt.sign(
            { id: user.id, pendingWebAuthn: true },
            process.env.JWT_SECRET,
            { expiresIn: '2m' }
        );
        res.cookie('jwt_pending', pendingToken, {
            httpOnly: true,
            sameSite: 'strict',
            secure  : true,   // server always runs HTTPS
            maxAge  : 2 * 60 * 1000   // 2 minutes maximum pour poser le doigt
        });
        await AuditService.log({ action: 'LOGIN_WEBAUTHN_REQUIRED', userId: user.id, ip, userAgent: ua, success: true });
        return res.json({ requiresWebAuthn: true, message: 'Mot de passe valide. Vérification biométrique requise.' });
    }
    // ──────────────────────────────────────────────────────────────────────────

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );

    await SessionModel.invalidateAll(user.id);
    await SessionModel.create(user.id, token, expiresAt, ip);
    await UserModel.updateLastLogin(user.id, ip);
    await AuditService.log({ action: 'LOGIN_SUCCESS', userId: user.id, ip, userAgent: ua, success: true });

    res.cookie('jwt', token, COOKIE_OPTIONS);
    res.json({
        success: true,
        user: { id: user.id, username: user.username, role: user.role, email: user.email }
    });
};

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
const logout = async (req, res) => {
    if (req.user?.id) {
        await SessionModel.invalidateAll(req.user.id);
        await AuditService.log({ action: 'LOGOUT', userId: req.user.id, ip: getIp(req), userAgent: getUA(req), success: true });
    }
    res.clearCookie('jwt', { httpOnly: true, sameSite: 'strict', secure: true });
    res.json({ success: true });
};

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
const me = (req, res) => {
    res.json({ user: req.user });
};

// ── POST /api/auth/change-password ───────────────────────────────────────────
const changePassword = async (req, res) => {
    const ip         = getIp(req);
    const ua         = getUA(req);
    const currentPwd = req.body.current_password || '';
    const newPwd     = req.body.new_password || '';
    const confirmPwd = req.body.confirm_password || '';

    if (newPwd !== confirmPwd) {
        await AuditService.log({ action: 'PASSWORD_CHANGE_FAILED', userId: req.user.id, details: { reason: 'Passwords do not match' }, ip, userAgent: ua, success: false });
        return res.status(400).json({ error: 'New passwords do not match.' });
    }

    const strength = ValidationService.isStrongPassword(newPwd);
    if (!strength.valid) {
        await AuditService.log({ action: 'PASSWORD_CHANGE_FAILED', userId: req.user.id, details: { reason: strength.reason }, ip, userAgent: ua, success: false });
        return res.status(400).json({ error: strength.reason });
    }

    const user = await UserModel.findById(req.user.id);
    const validCurrent = await CryptoService.verifyPassword(currentPwd, user.password_hash);
    if (!validCurrent) {
        await AuditService.log({ action: 'PASSWORD_CHANGE_FAILED', userId: req.user.id, details: { reason: 'Incorrect current password' }, ip, userAgent: ua, success: false });
        return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    // Hash with Argon2id
    const newHash = await CryptoService.hashPassword(newPwd);
    await UserModel.updatePassword(req.user.id, newHash);
    await AuditService.log({ action: 'PASSWORD_CHANGED', userId: req.user.id, ip, userAgent: ua, success: true });

    res.json({ success: true, message: 'Password changed successfully. Hashed with Argon2id.' });
};

module.exports = { login, logout, me, changePassword };
