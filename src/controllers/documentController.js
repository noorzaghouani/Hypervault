'use strict';
const DocumentModel     = require('../models/documentModel');
const UserModel         = require('../models/userModel');
const CryptoService     = require('../services/cryptoService');
const ValidationService = require('../services/validationService');
const AuditService      = require('../services/auditService');
const { invalidateCryptoAuditCache } = require('./dashboardController');

// ── GET /api/documents ────────────────────────────────────────────────────────
const listDocuments = async (req, res) => {
    try {
        const isSuperAdmin = req.user.role === 'super_admin';
        const docs = await DocumentModel.findAccessibleByUser(req.user);
        const decryptedDocs = docs.map(doc => {
            let title = '[Encrypted Title]';
            try { title = CryptoService.decrypt(doc.title_enc); } catch { title = '[Decryption Error]'; }
            const { title_enc, ...rest } = doc;
            return { ...rest, title };
        });
        res.json({ documents: decryptedDocs, isSuperAdmin });
    } catch {
        res.status(500).json({ error: 'Failed to retrieve documents.' });
    }
};

// ── POST /api/documents ───────────────────────────────────────────────────────
const createDocument = async (req, res) => {
    const title = ValidationService.sanitize(req.body.title || '');
    const content = req.body.content || '';
    let classification = ValidationService.sanitize(req.body.classification || 'PRIVATE');
    if (!['PRIVATE', 'SHARED WITH', 'PUBLIC'].includes(classification)) classification = 'PRIVATE';

    let sharedWith = 'all';
    if (classification === 'SHARED WITH') {
        const allowedTargets = ['all', 'super_admin', 'rh_manager', 'employee'];
        const requested = ValidationService.sanitize(req.body.shared_with || 'all');
        sharedWith = allowedTargets.includes(requested) ? requested : 'all';
    } else if (classification === 'PRIVATE') {
        sharedWith = 'author';
    }

    if (!ValidationService.isValidDocumentTitle(title)) {
        return res.status(400).json({ error: 'Title must be between 3 and 200 characters.' });
    }
    if (!ValidationService.isValidDocumentContent(content)) {
        return res.status(400).json({ error: 'Content cannot be empty or exceed 100,000 characters.' });
    }

    try {
        const user = await UserModel.findById(req.user.id);
        if (!user) return res.status(401).json({ error: 'User not found.' });

        const titleEnc    = CryptoService.encrypt(title);
        const contentEnc  = CryptoService.encrypt(content);
        const contentHmac = CryptoService.generateHMAC(content);

        let signature = null;
        if (user.private_key_enc) {
            let pem = user.private_key_enc;
            if (!pem.includes('BEGIN PRIVATE KEY') && !pem.includes('BEGIN RSA PRIVATE KEY')) {
                try { pem = CryptoService.decrypt(pem); } catch { pem = null; }
            }
            if (pem) signature = CryptoService.signDocument(content, pem);
        }

        const docId = await DocumentModel.create({ userId: req.user.id, titleEnc, contentEnc, contentHmac, signature, classification, sharedWith });
        invalidateCryptoAuditCache();
        await AuditService.log({ action: 'DOCUMENT_CREATED', userId: req.user.id, details: { docId, title: title.substring(0, 60), classification, sharedWith }, ip: req.ip, userAgent: req.headers['user-agent'], success: true });

        res.status(201).json({ success: true, docId, message: 'Document created and encrypted.' });
    } catch {
        res.status(500).json({ error: 'Encryption or document processing failed.' });
    }
};

// ── GET /api/documents/:id ────────────────────────────────────────────────────
const viewDocument = async (req, res) => {
    try {
        const docId = parseInt(req.params.id);
        const doc   = await DocumentModel.findById(docId);
        if (!doc) return res.status(404).json({ error: 'Document not found.' });

        const isOwner      = doc.user_id === req.user.id;
        const isSuperAdmin = req.user.role === 'super_admin';
        const isSharedWithRole = doc.classification === 'SHARED WITH' && (
            doc.shared_with === 'all' ||
            doc.shared_with === req.user.role ||
            (doc.shared_with && doc.shared_with.split(',').includes(req.user.role)) ||
            isSuperAdmin
        );

        let canAccess = false;
        if (doc.classification === 'PRIVATE')     canAccess = isOwner;
        else if (doc.classification === 'PUBLIC')  canAccess = true;
        else if (doc.classification === 'SHARED WITH') canAccess = isOwner || isSharedWithRole;
        else canAccess = isOwner || isSuperAdmin;

        if (!canAccess) {
            await AuditService.log({ action: 'UNAUTHORIZED_ACCESS', userId: req.user.id, details: { targetDocId: docId, reason: 'Restricted document' }, ip: req.ip, userAgent: req.headers['user-agent'], success: false });
            return res.status(403).json({ error: 'Access denied. You do not have permission to view this document.' });
        }

        const author = await UserModel.findById(doc.user_id);
        let title = '', content = '', aesValid = false, hmacValid = false, signatureValid = false;

        try {
            title   = CryptoService.decrypt(doc.title_enc);
            content = CryptoService.decrypt(doc.content_enc);
            aesValid = true;
            hmacValid = CryptoService.verifyHMAC(content, doc.content_hmac);
            if (doc.signature && author?.public_key) {
                signatureValid = CryptoService.verifySignature(content, doc.signature, author.public_key);
            }
        } catch {
            content  = '[Decryption failed — data may have been tampered with!]';
            aesValid = false;
        }

        await AuditService.log({ action: 'DOCUMENT_VIEWED', userId: req.user.id, details: { docId }, ip: req.ip, userAgent: req.headers['user-agent'], success: true });

        const { title_enc, content_enc, content_hmac, signature, ...docRest } = doc;
        res.json({
            document: {
                ...docRest,
                title,
                content,
                authorUsername: author?.username || 'Unknown',
                aesValid,
                hmacValid,
                signatureValid
            }
        });
    } catch {
        res.status(500).json({ error: 'Failed to access document.' });
    }
};

// ── DELETE /api/documents/:id ─────────────────────────────────────────────────
const deleteDocument = async (req, res) => {
    try {
        const docId = parseInt(req.params.id);
        const doc   = await DocumentModel.findById(docId);
        if (!doc) return res.status(404).json({ error: 'Document not found.' });

        // RBAC: rh_manager cannot delete
        if (req.user.role === 'rh_manager') {
            await AuditService.log({ action: 'UNAUTHORIZED_ACCESS', userId: req.user.id, details: { targetDocId: docId, reason: 'Role not authorized to delete' }, ip: req.ip, userAgent: req.headers['user-agent'], success: false });
            return res.status(403).json({ error: 'Forbidden: Your role is not authorized to delete documents.' });
        }

        // Anti-IDOR: PRIVATE docs are owner-only (consistent with GET restriction)
        // super_admin can delete SHARED WITH / PUBLIC docs they don't own, but not PRIVATE
        const isOwner = doc.user_id === req.user.id;
        const isSuperAdmin = req.user.role === 'super_admin';
        const canDelete = isOwner || (isSuperAdmin && doc.classification !== 'PRIVATE');

        if (!canDelete) {
            await AuditService.log({ action: 'UNAUTHORIZED_ACCESS', userId: req.user.id, details: { targetDocId: docId }, ip: req.ip, userAgent: req.headers['user-agent'], success: false });
            return res.status(403).json({ error: 'Forbidden.' });
        }

        let deletedTitle = `Doc #${docId}`;
        try { deletedTitle = CryptoService.decrypt(doc.title_enc); } catch {}

        await DocumentModel.delete(docId);
        invalidateCryptoAuditCache();
        await AuditService.log({ action: 'DOCUMENT_DELETED', userId: req.user.id, details: { docId, title: deletedTitle.substring(0, 60) }, ip: req.ip, userAgent: req.headers['user-agent'], success: true });

        res.json({ success: true, message: 'Document deleted.' });
    } catch {
        res.status(500).json({ error: 'Failed to delete document.' });
    }
};

// ── PUT /api/documents/:id ────────────────────────────────────────────────────
const updateDocument = async (req, res) => {
    try {
        const docId = parseInt(req.params.id);
        const doc   = await DocumentModel.findById(docId);
        if (!doc) return res.status(404).json({ error: 'Document not found.' });

        // Anti-IDOR: PRIVATE docs are owner-only (consistent with GET/DELETE restriction)
        // super_admin can update SHARED WITH / PUBLIC docs they don't own, but not PRIVATE
        const isOwnerUpd = doc.user_id === req.user.id;
        const isSuperAdminUpd = req.user.role === 'super_admin';
        const canUpdate = isOwnerUpd || (isSuperAdminUpd && doc.classification !== 'PRIVATE');

        if (!canUpdate) {
            await AuditService.log({ action: 'UNAUTHORIZED_ACCESS', userId: req.user.id, details: { targetDocId: docId, reason: 'Unauthorized update' }, ip: req.ip, userAgent: req.headers['user-agent'], success: false });
            return res.status(403).json({ error: 'Forbidden: You cannot update this document.' });
        }

        const title = ValidationService.sanitize(req.body.title || '');
        const content = req.body.content || '';
        let classification = ValidationService.sanitize(req.body.classification || doc.classification || 'PRIVATE');
        if (!['PRIVATE', 'SHARED WITH', 'PUBLIC'].includes(classification)) classification = 'PRIVATE';

        let sharedWith = 'all';
        if (classification === 'SHARED WITH') {
            const allowedTargets = ['all', 'super_admin', 'rh_manager', 'employee'];
            const requested = ValidationService.sanitize(req.body.shared_with || doc.shared_with || 'all');
            sharedWith = allowedTargets.includes(requested) ? requested : 'all';
        } else if (classification === 'PRIVATE') {
            sharedWith = 'author';
        }

        if (!ValidationService.isValidDocumentTitle(title))   return res.status(400).json({ error: 'Title must be between 3 and 200 characters.' });
        if (!ValidationService.isValidDocumentContent(content)) return res.status(400).json({ error: 'Content cannot be empty or exceed 100,000 characters.' });

        const user = await UserModel.findById(req.user.id);
        if (!user) return res.status(401).json({ error: 'User not found.' });

        const titleEnc    = CryptoService.encrypt(title);
        const contentEnc  = CryptoService.encrypt(content);
        const contentHmac = CryptoService.generateHMAC(content);

        let signature = doc.signature;
        if (user.private_key_enc) {
            let pem = user.private_key_enc;
            if (!pem.includes('BEGIN PRIVATE KEY') && !pem.includes('BEGIN RSA PRIVATE KEY')) {
                try { pem = CryptoService.decrypt(pem); } catch { pem = null; }
            }
            if (pem) signature = CryptoService.signDocument(content, pem);
        }

        await DocumentModel.update(docId, { titleEnc, contentEnc, contentHmac, signature, classification, sharedWith });
        invalidateCryptoAuditCache();
        await AuditService.log({ action: 'DOCUMENT_UPDATED', userId: req.user.id, details: { docId, title: title.substring(0, 60), classification, sharedWith }, ip: req.ip, userAgent: req.headers['user-agent'], success: true });

        res.json({ success: true, message: 'Document updated.' });
    } catch {
        res.status(500).json({ error: 'Failed to update document.' });
    }
};

module.exports = { listDocuments, createDocument, viewDocument, deleteDocument, updateDocument };
