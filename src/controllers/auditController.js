'use strict';
const AuditService = require('../services/auditService');

// ── GET /api/audit/logs ───────────────────────────────────────────────────────
const listLogs = async (req, res) => {
    try {
        const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = 10;
        const pagination = await AuditService.getPaginated(page, limit);
        const stats      = await AuditService.getStats();

        res.json({
            logs: pagination.logs.map(l => ({ ...l, detailsFormatted: AuditService.formatLogDetails(l) })),
            pagination: {
                page      : pagination.page,
                totalPages: pagination.totalPages,
                total     : pagination.total,
                limit     : pagination.limit
            },
            stats
        });
    } catch {
        res.status(500).json({ error: 'Failed to retrieve audit logs.' });
    }
};

// ── GET /api/audit/export ─────────────────────────────────────────────────────
const exportLogs = async (req, res) => {
    try {
        const logs = await AuditService.getAllForExport();

        let csv = 'Log_ID,Timestamp_UTC,Action,Username,Role,Status,IP_Address,User_Agent,Details\n';

        // Sanitize CSV cells to prevent formula injection (=, +, -, @ prefixes exploited by Excel/LibreOffice)
        const csvSafe = (val) => {
            if (typeof val !== 'string') return val;
            return /^[=+\-@]/.test(val) ? "'" + val : val;
        };

        for (const l of logs) {
            const row = [
                l.id,
                `"${new Date(l.timestamp).toISOString()}"`,
                `"${csvSafe(l.action || '')}"`,
                `"${csvSafe(l.username || 'Anonymous')}"`,
                `"${csvSafe(l.role || '')}"`,
                l.success ? 'SUCCESS' : 'FAILURE/BLOCKED',
                `"${csvSafe(l.ip_address || '')}"`,
                `"${csvSafe((l.user_agent || '').replace(/"/g, '""'))}"`,
                `"${csvSafe((l.details || '').replace(/"/g, '""'))}"`
            ];
            csv += row.join(',') + '\n';
        }

        await AuditService.log({ action: 'AUDIT_EXPORTED', userId: req.user.id, details: { format: 'CSV', recordCount: logs.length }, ip: req.ip, userAgent: req.headers['user-agent'], success: true });

        const filename = `hypervault_audit_${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.status(200).send(csv);
    } catch {
        res.status(500).json({ error: 'Audit export failed.' });
    }
};

module.exports = { listLogs, exportLogs };
