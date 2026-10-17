'use strict';
const express         = require('express');
const router          = express.Router();
const { requireAuth } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/rbacMiddleware');
const auditController = require('../controllers/auditController');

router.use(requireAuth);
router.use(requireRole('super_admin'));

router.get('/logs',   auditController.listLogs);
router.get('/export', auditController.exportLogs);

module.exports = router;
