'use strict';
const pool = require('../config/db');

class DocumentModel {

    // ── Find ──────────────────────────────────────────────────────────────────

    static async findAccessibleByUser(user) {
        if (user.role === 'super_admin') {
            const [rows] = await pool.execute(
                `SELECT d.id, d.user_id, d.title_enc, d.classification, d.shared_with, d.created_at, u.username
                 FROM documents d
                 JOIN users u ON d.user_id = u.id
                 WHERE d.user_id = ?
                    OR d.classification != 'PRIVATE'
                 ORDER BY d.created_at DESC`,
                [user.id]
            );
            return rows;
        }
        const [rows] = await pool.execute(
            `SELECT d.id, d.user_id, d.title_enc, d.classification, d.shared_with, d.created_at, u.username
             FROM documents d
             JOIN users u ON d.user_id = u.id
             WHERE d.user_id = ?
                OR d.classification = 'PUBLIC'
                OR (d.classification = 'SHARED WITH' AND (d.shared_with = 'all' OR d.shared_with = ?))
             ORDER BY d.created_at DESC`,
            [user.id, user.role]
        );
        return rows;
    }

    static async findAll() {
        const [rows] = await pool.execute(
            `SELECT d.id, d.user_id, d.title_enc, d.classification, d.shared_with, d.created_at, u.username
             FROM documents d
             JOIN users u ON d.user_id = u.id
             ORDER BY d.created_at DESC`
        );
        return rows;
    }

    static async findById(id) {
        const [rows] = await pool.execute('SELECT * FROM documents WHERE id = ?', [id]);
        return rows[0] || null;
    }

    // ── Create ────────────────────────────────────────────────────────────────

    static async create({ userId, titleEnc, contentEnc, contentHmac, signature, classification, sharedWith }) {
        const [result] = await pool.execute(
            'INSERT INTO documents (user_id, title_enc, content_enc, content_hmac, signature, classification, shared_with) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, titleEnc, contentEnc, contentHmac, signature, classification, sharedWith || 'all']
        );
        return result.insertId;
    }

    // ── Update ────────────────────────────────────────────────────────────────

    static async update(id, { titleEnc, contentEnc, contentHmac, signature, classification, sharedWith }) {
        await pool.execute(
            'UPDATE documents SET title_enc = ?, content_enc = ?, content_hmac = ?, signature = ?, classification = ?, shared_with = ? WHERE id = ?',
            [titleEnc, contentEnc, contentHmac, signature, classification, sharedWith || 'all', id]
        );
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    static async delete(id) {
        await pool.execute('DELETE FROM documents WHERE id = ?', [id]);
    }
}

module.exports = DocumentModel;
