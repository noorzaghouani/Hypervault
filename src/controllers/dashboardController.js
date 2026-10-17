'use strict';
const pool          = require('../config/db');
const AuditService  = require('../services/auditService');
const CryptoService = require('../services/cryptoService');

// In-memory 30-second TTL cache for live crypto audit to reduce CPU load under frequent polling
let cryptoAuditCache = {
    timestamp: 0,
    failures: { aesFailures: 0, hmacFailures: 0, rsaFailures: 0 }
};

const invalidateCryptoAuditCache = () => {
    cryptoAuditCache.timestamp = 0;
};

// ── GET /api/dashboard ────────────────────────────────────────────────────────
const getDashboard = async (req, res) => {
    try {
        const isSuperAdmin = req.user.role === 'super_admin';
        const [usersRow]   = await pool.query('SELECT COUNT(*) AS c FROM users');

        let totalDocs = 0, totalEvents = 0, recentLogs = [];
        let classCounts = { PRIVATE: 0, 'SHARED WITH': 0, PUBLIC: 0 };
        let pendingSecurityTasks = [], actorFleet = [];
        let healthScore = 100;
        let healthLevel = 'nominal';
        let healthBadge = 'Subsystems Nominal';
        let healthMessage = 'Health score • Zero vulnerabilities detected';
        let pillars = {
            aes:       { name: 'AES-256-GCM', status: 'Active',    level: 'nominal', sub: 'Payload Vault' },
            hmac:      { name: 'HMAC-SHA256', status: 'Verified',  level: 'nominal', sub: 'Anti-Tamper' },
            rsa:       { name: 'RSA-2048',    status: 'Enforced',  level: 'nominal', sub: 'Signatures' },
            zeroTrust: { name: 'Zero Trust',  status: 'Nominal',   level: 'nominal', sub: 'Access Guard' },
            rbac:      { name: 'RBAC Matrix', status: 'Compliant', level: 'nominal', sub: '3 Roles Strict' }
        };

        if (isSuperAdmin) {
            const [docsRow]   = await pool.query('SELECT COUNT(*) AS c FROM documents');
            const [eventsRow] = await pool.query('SELECT COUNT(*) AS c FROM audit_logs WHERE DATE(timestamp) = CURDATE()');
            totalDocs   = docsRow[0].c;
            totalEvents = eventsRow[0].c;
            recentLogs  = await AuditService.getRecent(25);

            const [classRows] = await pool.query('SELECT classification, COUNT(*) AS count FROM documents GROUP BY classification');
            for (const r of classRows) {
                if (r.classification) classCounts[r.classification] = r.count;
            }

            const [usersList] = await pool.query(
                'SELECT id, username, email, role, is_active, locked_until, last_login FROM users ORDER BY id ASC'
            );
            actorFleet = usersList;

            const locked   = usersList.filter(u => u.locked_until && new Date(u.locked_until) > new Date());
            const inactive = usersList.filter(u => !u.is_active);

            // ── 1. Audit cryptographique en direct (avec cache 30s pour préserver le CPU) ───
            let { aesFailures, hmacFailures, rsaFailures } = cryptoAuditCache.failures;

            if (Date.now() - cryptoAuditCache.timestamp >= 30000) {
                aesFailures  = 0;
                hmacFailures = 0;
                rsaFailures  = 0;

                const [docsForAudit] = await pool.query(`
                    SELECT d.id, d.title_enc, d.content_enc, d.content_hmac, d.signature, u.public_key
                    FROM documents d
                    LEFT JOIN users u ON d.user_id = u.id
                    ORDER BY d.id DESC LIMIT 50
                `);

                for (const doc of docsForAudit) {
                    let decryptedContent = null;

                    // Test AES-256-GCM
                    try {
                        CryptoService.decrypt(doc.title_enc);
                        decryptedContent = CryptoService.decrypt(doc.content_enc);
                    } catch {
                        aesFailures++;
                        hmacFailures++; // Si le payload est corrompu/modifié, l'intégrité est violée
                    }

                    // Test HMAC-SHA256 (Anti-Tamper)
                    if (decryptedContent !== null && doc.content_hmac) {
                        const hmacValid = CryptoService.verifyHMAC(decryptedContent, doc.content_hmac);
                        if (!hmacValid) {
                            hmacFailures++;
                        }
                    }

                    // Test Signature RSA-2048
                    if (decryptedContent !== null && doc.signature && doc.public_key) {
                        const rsaValid = CryptoService.verifySignature(decryptedContent, doc.signature, doc.public_key);
                        if (!rsaValid) {
                            rsaFailures++;
                        }
                    }
                }

                cryptoAuditCache = {
                    timestamp: Date.now(),
                    failures: { aesFailures, hmacFailures, rsaFailures }
                };
            }

            // ── 2. Audit des violations d'accès (RBAC / IDOR bloqués aujourd'hui) ───
            const [rbacRow] = await pool.query(
                "SELECT COUNT(*) AS c FROM audit_logs WHERE action = 'UNAUTHORIZED_ACCESS' AND DATE(timestamp) = CURDATE()"
            );
            const rbacViolations = rbacRow[0].c;

            // ── 3. Configuration dynamique des 5 Piliers ───────────────────────────
            // Pilier AES
            if (aesFailures > 0) {
                pillars.aes = {
                    name: 'AES-256-GCM',
                    status: 'Tampered',
                    level: 'critical',
                    sub: `${aesFailures} Decryption Error(s)`,
                    failures: aesFailures
                };
            }

            // Pilier HMAC
            if (hmacFailures > 0) {
                pillars.hmac = {
                    name: 'HMAC-SHA256',
                    status: 'Tampered',
                    level: 'critical',
                    sub: `${hmacFailures} Integrity Violation(s)`,
                    failures: hmacFailures
                };
            }

            // Pilier RSA
            if (rsaFailures > 0) {
                pillars.rsa = {
                    name: 'RSA-2048',
                    status: 'Invalid',
                    level: 'critical',
                    sub: `${rsaFailures} Signature Mismatch`,
                    failures: rsaFailures
                };
            }

            // Pilier Zero Trust (comptes verrouillés)
            if (locked.length > 0) {
                pillars.zeroTrust = {
                    name: 'Zero Trust',
                    status: 'Lockout Active',
                    level: 'warning',
                    sub: `${locked.length} Account(s) Locked`,
                    lockedCount: locked.length
                };
            } else if (inactive.length > 0) {
                pillars.zeroTrust = {
                    name: 'Zero Trust',
                    status: 'Review Needed',
                    level: 'warning',
                    sub: `${inactive.length} Inactive Account(s)`,
                    lockedCount: 0
                };
            }

            // Pilier RBAC (violations de droits)
            if (rbacViolations > 0) {
                pillars.rbac = {
                    name: 'RBAC Matrix',
                    status: `${rbacViolations} Blocked`,
                    level: 'warning',
                    sub: 'Unauthorized Access',
                    violations: rbacViolations
                };
            }

            // ── 4. Calcul dynamique du Health Score et du niveau global ─────────────
            let calculatedScore = 100;
            if (aesFailures > 0)  calculatedScore -= 35;
            if (hmacFailures > 0) calculatedScore -= 30;
            if (rsaFailures > 0)  calculatedScore -= 20;
            if (locked.length > 0) calculatedScore -= (15 * locked.length);
            if (rbacViolations > 0) calculatedScore -= Math.min(20, rbacViolations * 5);
            if (inactive.length > 0) calculatedScore -= Math.min(10, inactive.length * 2);

            calculatedScore = Math.max(15, Math.min(100, calculatedScore));
            healthScore = calculatedScore;

            if (aesFailures > 0 || hmacFailures > 0 || rsaFailures > 0) {
                healthLevel   = 'critical';
                healthBadge   = 'CRITICAL: Data Tampering';
                healthMessage = `Cryptographic violation detected: ${hmacFailures || aesFailures} database payload(s) altered!`;
            } else if (locked.length > 0) {
                healthLevel   = 'warning';
                healthBadge   = 'WARNING: Account Lockout';
                healthMessage = `${locked.length} account(s) locked out after consecutive failed attempts`;
            } else if (rbacViolations > 0) {
                healthLevel   = 'warning';
                healthBadge   = 'WARNING: Access Intercepted';
                healthMessage = `${rbacViolations} unauthorized access attempt(s) blocked by RBAC today`;
            } else if (calculatedScore < 95) {
                healthLevel   = 'warning';
                healthBadge   = 'Subsystems Degraded';
                healthMessage = 'Security posture degraded • Maintenance advised';
            }

            // Tâches de sécurité en attente
            if (hmacFailures > 0 || rsaFailures > 0) {
                pendingSecurityTasks.push({
                    title: 'Database Tampering Detected',
                    subtitle: 'Cryptographic hash / signature mismatch on documents',
                    priority: 'CRITICAL',
                    priorityClass: 'rose',
                    actionUrl: '/documents'
                });
            }
            if (locked.length > 0) {
                pendingSecurityTasks.push({
                    title: 'Account Lockout Detected',
                    subtitle: `${locked.length} account(s) currently locked`,
                    priority: 'HIGH PRIORITY',
                    priorityClass: 'amber',
                    actionUrl: '/admin/users'
                });
            }
            if (inactive.length > 0) {
                pendingSecurityTasks.push({
                    title: 'Inactive Accounts',
                    subtitle: `${inactive.length} account(s) disabled`,
                    priority: 'RECOMMENDED',
                    priorityClass: 'indigo',
                    actionUrl: '/admin/users'
                });
            }
            pendingSecurityTasks.push({
                title: 'Review Actor Privileges (RBAC)',
                subtitle: 'Quarterly review of role matrix compliance',
                priority: 'RECOMMENDED',
                priorityClass: 'teal',
                actionUrl: '/admin/users'
            });

        } else {
            const [myDocs] = await pool.query('SELECT COUNT(*) AS c FROM documents WHERE user_id = ?', [req.user.id]);
            totalDocs = myDocs[0].c;
        }

        res.json({
            user: req.user,
            stats: { totalUsers: usersRow[0].c, totalDocuments: totalDocs, totalEvents },
            recentLogs: recentLogs.map(l => ({ ...l, details: AuditService.formatLogDetails(l) })),
            isSuperAdmin,
            classCounts,
            actorFleet,
            pendingSecurityTasks,
            healthScore,
            healthLevel,
            healthBadge,
            healthMessage,
            pillars
        });
    } catch (err) {
        console.error('Dashboard error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { getDashboard, invalidateCryptoAuditCache };
