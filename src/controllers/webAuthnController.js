'use strict';
const jwt         = require('jsonwebtoken');
const WebAuthnModel = require('../models/webAuthnModel');
const SessionModel  = require('../models/sessionModel');
const AuditService  = require('../services/auditService');
const UserModel     = require('../models/userModel');

const {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

const RP_NAME  = 'HyperVault Security Portal';
const ORIGINS  = [
    'https://hypervault.com:3000',
    'https://hypervault.com',
    'https://localhost:3000',
    'http://localhost:3000',
    'http://localhost:5173'
];

const getRpId = (req) => {
    return req?.hostname === 'localhost' ? 'localhost' : 'hypervault.com';
};

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure  : true,   // server always runs HTTPS
    sameSite: 'strict',
    maxAge  : 24 * 60 * 60 * 1000
};

const CLEAR_COOKIE_OPTIONS = {
    httpOnly: true,
    secure  : true,
    sameSite: 'strict'
};

// ── Middleware : vérifie le token "en attente" après vérification du mot de passe ──
const requirePendingAuth = (req, res, next) => {
    const token = req.cookies?.jwt_pending;
    if (!token) return res.status(401).json({ error: 'Veuillez d\'abord valider votre mot de passe.' });
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        if (!payload.pendingWebAuthn) return res.status(401).json({ error: 'Session invalide.' });
        req.pendingUser = payload;
        next();
    } catch {
        res.clearCookie('jwt_pending', CLEAR_COOKIE_OPTIONS);
        return res.status(401).json({ error: 'Session expirée. Veuillez vous reconnecter.' });
    }
};

// ── POST /api/auth/webauthn/register-options ──────────────────────────────────
// Génère les options d'enregistrement d'un nouveau Passkey pour un utilisateur connecté
const registerOptions = async (req, res) => {
    try {
        const userId = req.user.id;
        const user   = await UserModel.findById(userId);
        if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

        // Récupérer les credentials déjà enregistrés (pour les exclure)
        const existingCreds = await WebAuthnModel.findByUserId(userId);
        const excludeCredentials = existingCreds.map(c => ({
            id       : Buffer.from(c.credential_id, 'base64url'),
            type     : 'public-key',
            transports: c.transports ? c.transports.split(',') : [],
        }));

        const options = await generateRegistrationOptions({
            rpName     : RP_NAME,
            rpID       : getRpId(req),
            userID     : Buffer.from(userId.toString()),
            userName   : user.username,
            userDisplayName: user.username,
            attestationType: 'none',
            excludeCredentials,
            authenticatorSelection: {
                authenticatorAttachment: 'cross-platform', // Force l'invite Smartphone (QR Code / Bluetooth)
                userVerification       : 'preferred',      // Tolérant selon les téléphones
                residentKey            : 'preferred',      // Indispensable pour Android Google Password Manager
            },
        });

        // Stocker le challenge en DB pour la vérification ultérieure
        await WebAuthnModel.saveChallenge(userId, options.challenge);

        await AuditService.log({
            action   : 'WEBAUTHN_REGISTER_INIT',
            userId,
            ip       : req.ip,
            userAgent: req.headers['user-agent'],
            details  : { username: user.username },
            success  : true
        });

        res.json(options);
    } catch (err) {
        console.error('WebAuthn registerOptions error:', err.message);
        res.status(500).json({ error: 'Impossible de générer les options d\'enregistrement.' });
    }
};

// ── POST /api/auth/webauthn/register-verify ───────────────────────────────────
// Vérifie la réponse du smartphone et enregistre la clé publique en base
const registerVerify = async (req, res) => {
    try {
        const userId = req.user.id;
        const expectedChallenge = await WebAuthnModel.getChallenge(userId);
        if (!expectedChallenge) return res.status(400).json({ error: 'Aucun challenge en cours. Recommencez.' });

        const verification = await verifyRegistrationResponse({
            response              : req.body,
            expectedChallenge,
            expectedOrigin        : ORIGINS,
            expectedRPID          : [getRpId(req), 'hypervault.com', 'localhost'],
            requireUserVerification: false,
        });

        await WebAuthnModel.clearChallenge(userId);

        const { verified, registrationInfo } = verification;
        if (!verified || !registrationInfo) {
            return res.status(400).json({ error: 'Vérification biométrique échouée.' });
        }

        const { credentialID, credentialPublicKey, counter } = registrationInfo;
        const credentialId = Buffer.from(credentialID).toString('base64url');
        const publicKey    = Buffer.from(credentialPublicKey).toString('base64');
        const transports   = req.body.response?.transports?.join(',') || '';

        await WebAuthnModel.saveCredential({ userId, credentialId, publicKey, counter, transports });

        await AuditService.log({
            action   : 'WEBAUTHN_REGISTERED',
            userId,
            ip       : req.ip,
            userAgent: req.headers['user-agent'],
            details  : { credentialId: credentialId.slice(0, 12) + '...' },
            success  : true
        });

        res.json({ success: true, message: 'Empreinte biométrique enregistrée avec succès !' });
    } catch (err) {
        console.error('WebAuthn registerVerify error:', err.message);
        res.status(500).json({ error: 'Erreur lors de l\'enregistrement biométrique.' });
    }
};

// ── POST /api/auth/webauthn/login-options ─────────────────────────────────────
// Appelé après validation du mot de passe — génère le challenge à signer par le téléphone
const loginOptions = async (req, res) => {
    try {
        const userId = req.pendingUser.id;
        const userCreds = await WebAuthnModel.findByUserId(userId);

        if (userCreds.length === 0) {
            return res.status(400).json({ error: 'Aucune empreinte enregistrée pour ce compte.' });
        }

        const allowCredentials = userCreds.map(c => {
            const cred = {
                id  : Buffer.from(c.credential_id, 'base64url'),
                type: 'public-key',
            };
            if (c.transports) {
                // Keep hybrid/ble/usb/nfc for cross-platform smartphone auth; avoid forcing 'internal'
                const tList = c.transports.split(',').filter(t => t !== 'internal');
                if (tList.length > 0) cred.transports = tList;
            }
            return cred;
        });

        const options = await generateAuthenticationOptions({
            rpID            : getRpId(req),
            userVerification: 'preferred',
            allowCredentials,
        });

        await WebAuthnModel.saveChallenge(userId, options.challenge);

        res.json(options);
    } catch (err) {
        console.error('WebAuthn loginOptions error:', err.message);
        res.status(500).json({ error: 'Unable to generate authentication challenge.' });
    }
};

// ── POST /api/auth/webauthn/login-verify ──────────────────────────────────────
// Vérifie la signature biométrique et délivre le cookie JWT de session
const loginVerify = async (req, res) => {
    try {
        const userId = req.pendingUser.id;
        const expectedChallenge = await WebAuthnModel.getChallenge(userId);
        if (!expectedChallenge) return res.status(400).json({ error: 'No active challenge found.' });

        // Retrouver le credential en DB via son ID
        const dbCred = await WebAuthnModel.findByCredentialId(req.body.id);
        if (!dbCred || dbCred.user_id !== userId) {
            return res.status(401).json({ error: 'Unrecognized credential.' });
        }

        const verification = await verifyAuthenticationResponse({
            response              : req.body,
            expectedChallenge,
            expectedOrigin        : ORIGINS,
            expectedRPID          : [getRpId(req), 'hypervault.com', 'localhost'],
            requireUserVerification: false,
            authenticator: {
                credentialID        : Buffer.from(dbCred.credential_id, 'base64url'),
                credentialPublicKey : Buffer.from(dbCred.credential_public_key, 'base64'),
                counter             : dbCred.counter,
                transports          : dbCred.transports ? dbCred.transports.split(',') : [],
            },
        });

        await WebAuthnModel.clearChallenge(userId);

        const { verified, authenticationInfo } = verification;
        if (!verified) {
            await AuditService.log({ action: 'WEBAUTHN_LOGIN_FAILED', userId, ip: req.ip, userAgent: req.headers['user-agent'], success: false });
            return res.status(401).json({ error: 'Biometric verification failed.' });
        }

        // Mettre à jour le compteur anti-clonage
        await WebAuthnModel.updateCounter(dbCred.credential_id, authenticationInfo.newCounter);

        // Charger les informations complètes de l'utilisateur
        const user = await UserModel.findById(userId);

        // Émettre la session JWT complète (même procédure que dans authController.login)
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        await SessionModel.invalidateAll(user.id);
        await SessionModel.create(user.id, token, expiresAt, req.ip);
        await UserModel.updateLastLogin(user.id, req.ip);

        await AuditService.log({
            action   : 'WEBAUTHN_LOGIN_SUCCESS',
            userId,
            ip       : req.ip,
            userAgent: req.headers['user-agent'],
            details  : { credentialId: dbCred.credential_id.slice(0, 12) + '...' },
            success  : true
        });

        // Effacer le cookie temporaire et émettre le JWT de session
        res.clearCookie('jwt_pending', CLEAR_COOKIE_OPTIONS);
        res.cookie('jwt', token, COOKIE_OPTIONS);
        res.json({
            success: true,
            user   : { id: user.id, username: user.username, role: user.role, email: user.email }
        });
    } catch (err) {
        console.error('WebAuthn loginVerify error:', err.message);
        res.status(500).json({ error: 'Erreur lors de la vérification biométrique.' });
    }
};

// ── GET /api/auth/webauthn/status ─────────────────────────────────────────────
// Retourne si l'utilisateur a un passkey enregistré
const status = async (req, res) => {
    try {
        const creds = await WebAuthnModel.findByUserId(req.user.id);
        res.json({
            enrolled: creds.length > 0,
            count   : creds.length,
            createdAt: creds[0]?.created_at || null
        });
    } catch {
        res.status(500).json({ error: 'Erreur lors de la récupération du statut.' });
    }
};

// ── DELETE /api/auth/webauthn/remove ──────────────────────────────────────────
// Supprime tous les passkeys d'un utilisateur
const remove = async (req, res) => {
    try {
        const deleted = await WebAuthnModel.deleteByUserId(req.user.id);
        await AuditService.log({
            action   : 'WEBAUTHN_REMOVED',
            userId   : req.user.id,
            ip       : req.ip,
            userAgent: req.headers['user-agent'],
            details  : { deleted },
            success  : true
        });
        res.json({ success: true, message: `${deleted} passkey(s) supprimé(s).` });
    } catch {
        res.status(500).json({ error: 'Erreur lors de la suppression.' });
    }
};

module.exports = { registerOptions, registerVerify, loginOptions, loginVerify, status, remove, requirePendingAuth };
