'use strict';
const pool = require('../config/db');

class AuditService {

    // ── Write log ─────────────────────────────────────────────────────────────

    static async log({ action, userId = null, details = null, ip = null, userAgent = null, success = true }) {
        await pool.execute(
            'INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent, success) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, action, details ? JSON.stringify(details) : null, ip, userAgent, success]
        );
    }

    // ── Read logs ─────────────────────────────────────────────────────────────

    static async getRecent(limit = 100) {
        const [rows] = await pool.query(
            `SELECT al.*, u.username, u.role
             FROM audit_logs al
             LEFT JOIN users u ON al.user_id = u.id
             ORDER BY al.timestamp DESC
             LIMIT ?`,
            [Number(limit)]
        );
        return rows;
    }

    static async getPaginated(page = 1, limit = 10) {
        const safePage  = Math.max(1, parseInt(page, 10) || 1);
        const safeLimit = Math.max(1, parseInt(limit, 10) || 10);
        const offset    = (safePage - 1) * safeLimit;

        const [countRow] = await pool.query('SELECT COUNT(*) AS total FROM audit_logs');
        const total      = countRow[0].total;
        const totalPages = Math.max(1, Math.ceil(total / safeLimit));

        const [rows] = await pool.query(
            `SELECT al.*, u.username, u.role
             FROM audit_logs al
             LEFT JOIN users u ON al.user_id = u.id
             ORDER BY al.timestamp DESC
             LIMIT ? OFFSET ?`,
            [safeLimit, offset]
        );

        return {
            logs: rows,
            page: safePage,
            limit: safeLimit,
            total,
            totalPages
        };
    }

    static async getStats() {
        const [rows] = await pool.execute(
            `SELECT action, COUNT(*) AS count FROM audit_logs GROUP BY action ORDER BY count DESC`
        );
        return rows;
    }

    // ── Export all logs ───────────────────────────────────────────────────────

    static async getAllForExport() {
        const [rows] = await pool.execute(
            `SELECT al.id, al.timestamp, al.action, u.username, u.role, al.success, al.ip_address, al.user_agent, al.details
             FROM audit_logs al
             LEFT JOIN users u ON al.user_id = u.id
             ORDER BY al.timestamp DESC`
        );
        return rows;
    }

    // ── Format human-readable details ─────────────────────────────────────────

    static formatLogDetails(log) {
        let d = {};
        try {
            if (log.details) {
                d = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
            }
        } catch {
            return log.details || '—';
        }

        switch (log.action) {
            case 'DOCUMENT_CREATED':
                return `Created file #${d.docId || ''} ${d.title ? '"' + d.title + '"' : ''} [${d.classification || 'PRIVATE'}${d.sharedWith && d.sharedWith !== 'all' ? ` -> ${d.sharedWith}` : ''}]`;
            case 'DOCUMENT_UPDATED':
                return `Modified file #${d.docId || ''} ${d.title ? '"' + d.title + '"' : ''} [${d.classification || 'PRIVATE'}${d.sharedWith && d.sharedWith !== 'all' ? ` -> ${d.sharedWith}` : ''}]`;
            case 'DOCUMENT_DELETED':
                return `Deleted file #${d.docId || ''} ${d.title ? '"' + d.title + '"' : ''}`;
            case 'DOCUMENT_VIEWED':
                return `Decrypted & Viewed file #${d.docId || ''} ${d.title ? '"' + d.title + '"' : ''}`;
            case 'LOGIN_SUCCESS':
                return `User logged in successfully`;
            case 'LOGIN_FAILED':
                return `Login failed: Invalid credentials ${d.attempts ? `(attempt ${d.attempts})` : ''} ${d.identifier ? `[${d.identifier}]` : ''}`;
            case 'LOGOUT':
                return `User logged out / session terminated`;
            case 'PASSWORD_CHANGED':
                return `User changed their password`;
            case 'PASSWORD_CHANGE_FAILED':
                return `Failed password change attempt (${d.reason || 'invalid'})`;
            case 'PASSWORD_RESET':
                return `Admin reset password for user "${d.targetUsername || d.targetUserId || ''}"`;
            case 'ROLE_CHANGED':
                return `Changed role of user #${d.targetId || ''} to [${d.newRole || ''}]`;
            case 'ACCOUNT_LOCKED':
                return `Account locked after 5 failed attempts`;
            case 'ACCOUNT_LOCKED_ATTEMPT':
                return `Attempted login to locked account`;
            case 'ACCOUNT_UNLOCKED':
                return `Account unlocked for user #${d.targetId || ''}`;
            case 'ACCOUNT_DISABLED':
                return `Account disabled for user #${d.targetId || ''}`;
            case 'ACCOUNT_ENABLED':
                return `Account re-enabled for user #${d.targetId || ''}`;
            case 'USER_CREATED':
                return `Created user "${d.username || ''}" as [${d.role || ''}]`;
            case 'USER_CREATION_FAILED':
                return `Failed user creation: ${d.reason || ''}`;
            case 'WEBAUTHN_REGISTER_INIT':
                return `WebAuthn registration initiated for "${d.username || ''}"`;
            case 'WEBAUTHN_REGISTERED':
                return `WebAuthn passkey enrolled (credential: ${d.credentialId || ''})`;
            case 'WEBAUTHN_REMOVED':
                return `WebAuthn passkey(s) removed (${d.deleted || 0} credential(s))`;
            case 'WEBAUTHN_LOGIN_REQUIRED':
                return `Password validated — WebAuthn biometric verification required`;
            case 'WEBAUTHN_LOGIN_SUCCESS':
                return `WebAuthn biometric authentication successful`;
            case 'WEBAUTHN_LOGIN_FAILED':
                return `WebAuthn biometric verification failed`;
            case 'AUDIT_EXPORTED':
                return `Exported ${d.recordCount || 0} audit logs (${d.format || 'CSV'})`;
            case 'UNAUTHORIZED_ACCESS':
                return `BLOCKED: Forbidden access to ${d.endpoint || (d.targetDocId ? 'file #' + d.targetDocId : 'resource')} ${d.reason ? '(' + d.reason + ')' : ''}`;
            default:
                return log.details ? (typeof log.details === 'string' ? log.details : JSON.stringify(log.details)) : '—';
        }
    }
}

module.exports = AuditService;
