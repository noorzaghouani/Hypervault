'use strict';
const pool = require('../config/db');

// Multi-tab active challenge registry with 5-minute TTL per challenge
// Prevents race conditions and overwrites when multiple tabs or devices are used
const activeChallenges = new Map();

class WebAuthnModel {

    // ── Challenge temporaire (stocké pendant la vérification) ─────────────────

    static async saveChallenge(userId, challenge) {
        if (!activeChallenges.has(userId)) activeChallenges.set(userId, []);
        const list = activeChallenges.get(userId);
        const now  = Date.now();
        // Keep valid non-expired challenges, limit to last 5
        const filtered = list.filter(item => item.expiresAt > now).slice(-4);
        filtered.push({ challenge, expiresAt: now + 5 * 60 * 1000 });
        activeChallenges.set(userId, filtered);

        await pool.execute('UPDATE users SET webauthn_challenge = ? WHERE id = ?', [challenge, userId]);
    }

    static async getChallenge(userId) {
        const [rows] = await pool.execute('SELECT webauthn_challenge FROM users WHERE id = ?', [userId]);
        const dbChallenge = rows[0]?.webauthn_challenge || null;
        const memoryList  = activeChallenges.get(userId) || [];
        const hasValidMemory = memoryList.some(item => item.expiresAt > Date.now());

        if (!dbChallenge && !hasValidMemory) {
            return null;
        }

        // Return custom verifier function natively supported by @simplewebauthn v7
        // allowing any valid unexpired challenge generated for this user to be accepted
        const verifier = (incomingChallenge) => {
            const list = activeChallenges.get(userId) || [];
            const idx = list.findIndex(item => item.challenge === incomingChallenge && item.expiresAt > Date.now());
            if (idx !== -1) {
                list.splice(idx, 1);
                return true;
            }
            if (dbChallenge && incomingChallenge === dbChallenge) {
                return true;
            }
            return false;
        };

        // Fallback for callers expecting string representation
        verifier.toString = () => dbChallenge || '';
        verifier.valueOf  = () => dbChallenge || '';

        return verifier;
    }

    static async clearChallenge(userId) {
        activeChallenges.delete(userId);
        await pool.execute('UPDATE users SET webauthn_challenge = NULL WHERE id = ?', [userId]);
    }

    // ── Credentials enregistrés ───────────────────────────────────────────────

    static async saveCredential({ userId, credentialId, publicKey, counter, transports }) {
        await pool.execute(
            'INSERT INTO webauthn_credentials (user_id, credential_id, credential_public_key, counter, transports) VALUES (?, ?, ?, ?, ?)',
            [userId, credentialId, publicKey, counter, transports || '']
        );
    }

    static async findByUserId(userId) {
        const [rows] = await pool.execute(
            'SELECT * FROM webauthn_credentials WHERE user_id = ?',
            [userId]
        );
        return rows;
    }

    static async findByCredentialId(credentialId) {
        const [rows] = await pool.execute(
            'SELECT * FROM webauthn_credentials WHERE credential_id = ?',
            [credentialId]
        );
        return rows[0] || null;
    }

    static async updateCounter(credentialId, counter) {
        await pool.execute(
            'UPDATE webauthn_credentials SET counter = ? WHERE credential_id = ?',
            [counter, credentialId]
        );
    }

    static async hasCredentials(userId) {
        const [rows] = await pool.execute(
            'SELECT COUNT(*) AS cnt FROM webauthn_credentials WHERE user_id = ?',
            [userId]
        );
        return rows[0].cnt > 0;
    }

    static async deleteByUserId(userId) {
        const [result] = await pool.execute(
            'DELETE FROM webauthn_credentials WHERE user_id = ?',
            [userId]
        );
        return result.affectedRows;
    }
}

module.exports = WebAuthnModel;
