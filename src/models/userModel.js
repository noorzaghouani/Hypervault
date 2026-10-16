'use strict';
const pool = require('../config/db');

class UserModel {

    // ── Find ──────────────────────────────────────────────────────────────────

    static async findByEmail(email) {
        if (!email) return null;
        const [rows] = await pool.execute(
            'SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1',
            [email.trim().toLowerCase()]
        );
        return rows[0] || null;
    }

    // FIXED: removed LIKE partial match (was allowing username enumeration)
    static async findByIdentifier(identifier) {
        if (!identifier) return null;
        const clean = identifier.trim().toLowerCase();
        const [rows] = await pool.execute(
            `SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(username) = ? LIMIT 1`,
            [clean, clean]
        );
        return rows[0] || null;
    }

    static async findById(id) {
        const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
        return rows[0] || null;
    }

    static async findAll() {
        const [rows] = await pool.execute(
            'SELECT id, username, email, role, is_active, failed_attempts, locked_until, last_login, created_at FROM users ORDER BY created_at DESC'
        );
        return rows;
    }

    // ── Account lockout ───────────────────────────────────────────────────────

    static async incrementFailedAttempts(id) {
        await pool.execute('UPDATE users SET failed_attempts = failed_attempts + 1 WHERE id = ?', [id]);
        const user = await UserModel.findById(id);
        return user.failed_attempts;
    }

    static async lockAccount(id) {
        await pool.execute(
            "UPDATE users SET locked_until = DATE_ADD(NOW(), INTERVAL 15 MINUTE), failed_attempts = 0 WHERE id = ?",
            [id]
        );
    }

    static async resetFailedAttempts(id) {
        await pool.execute('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?', [id]);
    }

    static async unlock(id) {
        await pool.execute('UPDATE users SET locked_until = NULL, failed_attempts = 0 WHERE id = ?', [id]);
    }

    // ── Login tracking ────────────────────────────────────────────────────────

    static async updateLastLogin(id, ip) {
        await pool.execute('UPDATE users SET last_login = NOW(), last_ip = ? WHERE id = ?', [ip, id]);
    }

    // ── Password ──────────────────────────────────────────────────────────────

    static async updatePassword(id, hash) {
        await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    static async create({ username, email, passwordHash, role, publicKey, privateKeyEnc }) {
        const [result] = await pool.execute(
            'INSERT INTO users (username, email, password_hash, role, public_key, private_key_enc) VALUES (?, ?, ?, ?, ?, ?)',
            [username, email, passwordHash, role, publicKey, privateKeyEnc]
        );
        return result.insertId;
    }

    static async updateRole(id, role) {
        await pool.execute('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    }

    static async setActive(id, isActive) {
        await pool.execute('UPDATE users SET is_active = ? WHERE id = ?', [isActive, id]);
    }

    // Guard: count how many active super_admins exist (used to prevent locking out last one)
    static async countActiveSuperAdmins() {
        const [rows] = await pool.execute(
            'SELECT COUNT(*) AS cnt FROM users WHERE role = ? AND is_active = 1',
            ['super_admin']
        );
        return rows[0].cnt;
    }
}

module.exports = UserModel;
