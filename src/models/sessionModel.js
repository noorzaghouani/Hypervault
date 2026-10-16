'use strict';
const crypto = require('crypto');
const pool   = require('../config/db');

// Hash the JWT before DB storage — raw token never persisted
// If DB leaks, attacker cannot replay sessions
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

class SessionModel {

    // ── Create ────────────────────────────────────────────────────────────────

    static async create(userId, token, expiresAt, ip) {
        await pool.execute(
            'INSERT INTO sessions (user_id, jwt_token, expires_at, ip_address) VALUES (?, ?, ?, ?)',
            [userId, hashToken(token), expiresAt, ip]
        );
    }

    // ── Validate ──────────────────────────────────────────────────────────────

    static async findByToken(token) {
        const [rows] = await pool.execute(
            'SELECT * FROM sessions WHERE jwt_token = ? AND is_valid = TRUE AND expires_at > NOW()',
            [hashToken(token)]
        );
        return rows[0] || null;
    }

    // ── Invalidate ────────────────────────────────────────────────────────────

    static async invalidateAll(userId) {
        await pool.execute('UPDATE sessions SET is_valid = FALSE WHERE user_id = ?', [userId]);
    }

    // ── Cleanup expired/invalid sessions ─────────────────────────────────────

    static async cleanupExpired() {
        const [result] = await pool.execute(
            'DELETE FROM sessions WHERE expires_at < NOW() OR is_valid = FALSE'
        );
        return result.affectedRows;
    }
}

module.exports = SessionModel;
