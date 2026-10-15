'use strict';

class ValidationService {

    // ── Sanitize 

    static sanitize(input) {
        if (typeof input !== 'string') return '';
        return input.replace(/[\0\u0008\u000B\u000C]/g, '').trim().replace(/[<>]/g, '');
    }

    // ── Email 

    static isValidEmail(email) {
        if (typeof email !== 'string' || email.length > 254) return false;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // ── Username 

    static isValidUsername(username) {
        if (typeof username !== 'string') return false;
        return /^[a-zA-Z0-9_]{3,30}$/.test(username);
    }

    // ── Password strength
    
    static isStrongPassword(password) {
        if (typeof password !== 'string')       return { valid: false, reason: 'Password must be a string.' };
        if (password.length < 12)               return { valid: false, reason: 'At least 12 characters required.' };
        if (!/[A-Z]/.test(password))            return { valid: false, reason: 'One uppercase letter required.' };
        if (!/[a-z]/.test(password))            return { valid: false, reason: 'One lowercase letter required.' };
        if (!/[0-9]/.test(password))            return { valid: false, reason: 'One digit required.' };
        if (!/[!@#$%^&*()\-_=+[\]{};'",.<>?]/.test(password))
                                                return { valid: false, reason: 'One special character required.' };
        return { valid: true };
    }

    static getPasswordStrength(password) {
        if (typeof password !== 'string') return { score: 0, level: 'weak', feedback: [] };

        let score = 0;
        const feedback = [];

        if (password.length >= 12)                                          score += 25; else feedback.push('At least 12 characters');
        if (/[A-Z]/.test(password))                                         score += 20; else feedback.push('One uppercase letter');
        if (/[a-z]/.test(password))                                         score += 20; else feedback.push('One lowercase letter');
        if (/[0-9]/.test(password))                                         score += 15; else feedback.push('One digit');
        if (/[!@#$%^&*()\-_=+[\]{};'",.<>?]/.test(password))               score += 20; else feedback.push('One special character');

        const level = score >= 80 ? 'strong' : score >= 50 ? 'medium' : 'weak';
        return { score, level, feedback };
    }

    // ── Document fields 

    static isValidDocumentTitle(title) {
        if (typeof title !== 'string') return false;
        const t = title.trim();
        return t.length >= 3 && t.length <= 200;
    }

    static isValidDocumentContent(content) {
        if (typeof content !== 'string') return false;
        const c = content.trim();
        return c.length >= 1 && c.length <= 100000;
    }
}

module.exports = ValidationService;
