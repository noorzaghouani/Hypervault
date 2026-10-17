'use strict';
const crypto            = require('crypto');
const UserModel         = require('../models/userModel');
const AuditService      = require('../services/auditService');
const CryptoService     = require('../services/cryptoService');
const ValidationService = require('../services/validationService');

// ── Helper: validate numeric route param ──────────────────────────────────────
const parseId = (param) => {
    const id = parseInt(param, 10);
    return (isNaN(id) || id < 1) ? null : id;
};

// ── GET /api/admin/users ──────────────────────────────────────────────────────
const listUsers = async (req, res) => {
    try {
        const users = await UserModel.findAll();
        res.json({ users });
    } catch {
        res.status(500).json({ error: 'Failed to retrieve users.' });
    }
};

// ── POST /api/admin/users/:id/unlock ─────────────────────────────────────────
const unlockUser = async (req, res) => {
    try {
        const targetId = parseId(req.params.id);
        if (!targetId) return res.status(400).json({ error: 'Invalid user ID.' });
        await UserModel.unlock(targetId);
        await AuditService.log({ action: 'ACCOUNT_UNLOCKED', userId: req.user.id, details: { targetId }, ip: req.ip, userAgent: req.headers['user-agent'], success: true });
        res.json({ success: true, message: 'Account unlocked.' });
    } catch {
        res.status(500).json({ error: 'Failed to unlock account.' });
    }
};

// ── POST /api/admin/users/:id/role ────────────────────────────────────────────
const updateRole = async (req, res) => {
    try {
        const targetId = parseId(req.params.id);
        if (!targetId) return res.status(400).json({ error: 'Invalid user ID.' });
        const newRole  = req.body.role;
        const allowed  = ['super_admin', 'rh_manager', 'employee'];
        if (!allowed.includes(newRole)) return res.status(400).json({ error: 'Invalid role.' });

        // Guard: prevent demoting the last active super_admin
        const target = await UserModel.findById(targetId);
        if (target && target.role === 'super_admin' && newRole !== 'super_admin') {
            const count = await UserModel.countActiveSuperAdmins();
            if (count <= 1) {
                return res.status(409).json({ error: 'Cannot demote the last active super_admin.' });
            }
        }

        await UserModel.updateRole(targetId, newRole);
        await AuditService.log({ action: 'ROLE_CHANGED', userId: req.user.id, details: { targetId, newRole }, ip: req.ip, userAgent: req.headers['user-agent'], success: true });
        res.json({ success: true, message: `Role updated to ${newRole}.` });
    } catch {
        res.status(500).json({ error: 'Failed to update role.' });
    }
};

// ── POST /api/admin/users/:id/toggle ─────────────────────────────────────────
const toggleActive = async (req, res) => {
    try {
        const targetId = parseId(req.params.id);
        if (!targetId) return res.status(400).json({ error: 'Invalid user ID.' });
        const target   = await UserModel.findById(targetId);
        if (!target) return res.status(404).json({ error: 'User not found.' });

        // Guard: prevent disabling the last active super_admin
        if (target.role === 'super_admin' && target.is_active) {
            const count = await UserModel.countActiveSuperAdmins();
            if (count <= 1) {
                return res.status(409).json({ error: 'Cannot disable the last active super_admin.' });
            }
        }

        await UserModel.setActive(targetId, !target.is_active);
        const action = target.is_active ? 'ACCOUNT_DISABLED' : 'ACCOUNT_ENABLED';
        await AuditService.log({ action, userId: req.user.id, details: { targetId }, ip: req.ip, userAgent: req.headers['user-agent'], success: true });
        res.json({ success: true, isActive: !target.is_active });
    } catch {
        res.status(500).json({ error: 'Failed to toggle account status.' });
    }
};

// ── POST /api/admin/users ─────────────────────────────────────────────────────
const createUser = async (req, res) => {
    const username = ValidationService.sanitize(req.body.username || '');
    const email    = (req.body.email || '').trim().toLowerCase();
    const role     = req.body.role || 'employee';
    const password = req.body.password || '';

    const allowedRoles = ['super_admin', 'rh_manager', 'employee'];
    if (!allowedRoles.includes(role))            return res.status(400).json({ error: 'Invalid role.' });
    if (!ValidationService.isValidUsername(username)) return res.status(400).json({ error: 'Username must be 3-30 alphanumeric characters.' });
    if (!ValidationService.isValidEmail(email))  return res.status(400).json({ error: 'Invalid email address.' });

    const strength = ValidationService.isStrongPassword(password);
    if (!strength.valid) return res.status(400).json({ error: strength.reason });

    try {
        const existing = await UserModel.findByEmail(email);
        if (existing) return res.status(409).json({ error: 'Email already registered.' });

        // 1. Hash with Argon2id
        const passwordHash = await CryptoService.hashPassword(password);

        // 2. Generate RSA-2048 key pair (async — avoids blocking the event loop)
        const { publicKey, privateKey } = await new Promise((resolve, reject) => {
            crypto.generateKeyPair('rsa', {
                modulusLength     : 2048,
                publicKeyEncoding : { type: 'spki',  format: 'pem' },
                privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
            }, (err, pub, priv) => {
                if (err) return reject(err);
                resolve({ publicKey: pub, privateKey: priv });
            });
        });

        // 3. Encrypt private key AES-256-GCM at rest
        const privateKeyEnc = CryptoService.encrypt(privateKey);

        // 4. Insert
        const newUserId = await UserModel.create({ username, email, passwordHash, role, publicKey, privateKeyEnc });

        await AuditService.log({ action: 'USER_CREATED', userId: req.user.id, details: { createdUserId: newUserId, username, role, email }, ip: req.ip, userAgent: req.headers['user-agent'], success: true });

        // Return temp password in response body (NEVER in URL)
        res.status(201).json({ success: true, userId: newUserId, username, tempPassword: password, message: 'User created successfully.' });
    } catch (err) {
        console.error('createUser error:', err.message);
        res.status(500).json({ error: 'Failed to create user.' });
    }
};

// ── POST /api/admin/users/:id/reset-password ─────────────────────────────────
const resetPassword = async (req, res) => {
    try {
        const targetId = parseId(req.params.id);
        if (!targetId) return res.status(400).json({ error: 'Invalid user ID.' });
        const target   = await UserModel.findById(targetId);
        if (!target) return res.status(404).json({ error: 'User not found.' });

        const tempPassword = 'HyperVault#' + crypto.randomBytes(4).toString('hex') + '!' + new Date().getFullYear();
        const newHash      = await CryptoService.hashPassword(tempPassword);

        await UserModel.updatePassword(targetId, newHash);
        await UserModel.unlock(targetId);

        await AuditService.log({ action: 'PASSWORD_RESET', userId: req.user.id, details: { targetUserId: targetId, targetUsername: target.username }, ip: req.ip, userAgent: req.headers['user-agent'], success: true });

        res.json({ success: true, tempPassword, username: target.username });
    } catch {
        res.status(500).json({ error: 'Password reset failed.' });
    }
};

module.exports = { listUsers, unlockUser, updateRole, toggleActive, createUser, resetPassword };
