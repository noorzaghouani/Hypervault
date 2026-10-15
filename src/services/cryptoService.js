'use strict';

const bcrypt = require('bcrypt');
const argon2 = require('argon2');
const crypto = require('crypto');

// ── Key helpers ───────────────────────────────────────────────────────────────

const _getAesKey = () => {
    const key = process.env.AES_KEY;
    if (!key || key.length !== 64) {
        throw new Error('AES_KEY must be a 64-character hex string. Check your .env file.');
    }
    return Buffer.from(key, 'hex');
};

// Separate key for HMAC — never the same material as AES_KEY
const _getHmacKey = () => {
    const key = process.env.HMAC_KEY;
    if (!key || key.length !== 64) {
        throw new Error('HMAC_KEY must be a 64-character hex string. Check your .env file.');
    }
    return key;  // used as string key for crypto.createHmac
};

class CryptoService {

    // ── Argon2id / bcrypt Password Hashing 

    static async hashPassword(password) {
        return await argon2.hash(password, {
            type: argon2.argon2id,
            memoryCost: 65536, // 64 MB (RFC 9106 / OWASP recommended)
            timeCost: 3,       // 3 iterations
            parallelism: 4
        });
    }

    static async verifyPassword(password, hash) {
        if (!hash || typeof hash !== 'string') return false;
        if (hash.startsWith('$argon2')) {
            try {
                return await argon2.verify(hash, password);
            } catch {
                return false;
            }
        }
        if (hash.startsWith('$2')) {
            try {
                return await bcrypt.compare(password, hash);
            } catch {
                return false;
            }
        }
        return false;
    }

    static needsRehash(hash) {
        return !hash || !hash.startsWith('$argon2id');
    }

    // ── AES-256-GCM 

    static encrypt(plaintext) {
        const key       = _getAesKey();
        const iv        = crypto.randomBytes(12);
        const cipher    = crypto.createCipheriv('aes-256-gcm', key, iv);
        const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
        const authTag   = cipher.getAuthTag();

        return iv.toString('hex') + authTag.toString('hex') + encrypted.toString('hex');
    }

    static decrypt(encryptedHex) {
        const key        = _getAesKey();
        const iv         = Buffer.from(encryptedHex.slice(0, 24), 'hex');
        const authTag    = Buffer.from(encryptedHex.slice(24, 56), 'hex');
        const ciphertext = Buffer.from(encryptedHex.slice(56), 'hex');

        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);

        return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    }

    // ── HMAC-SHA256 (uses dedicated HMAC_KEY — separate from AES_KEY)

    static generateHMAC(message) {
        return crypto.createHmac('sha256', _getHmacKey()).update(message, 'utf8').digest('hex');
    }

    static verifyHMAC(message, storedHmacHex) {
        try {
            const computed = CryptoService.generateHMAC(message);
            return crypto.timingSafeEqual(
                Buffer.from(computed, 'hex'),
                Buffer.from(storedHmacHex, 'hex')
            );
        } catch {
            return false;
        }
    }

    // ── RSA-2048 Signature 

    static signDocument(content, privateKeyPem) {
        const sign = crypto.createSign('RSA-SHA256');
        sign.update(content, 'utf8');
        sign.end();
        return sign.sign(privateKeyPem, 'base64');
    }

    static verifySignature(content, signatureB64, publicKeyPem) {
        try {
            const verify = crypto.createVerify('RSA-SHA256');
            verify.update(content, 'utf8');
            verify.end();
            return verify.verify(publicKeyPem, signatureB64, 'base64');
        } catch {
            return false;
        }
    }
}

module.exports = CryptoService;
