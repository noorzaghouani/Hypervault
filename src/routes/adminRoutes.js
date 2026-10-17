'use strict';
const express         = require('express');
const router          = express.Router();
const { requireAuth } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/rbacMiddleware');
const rateLimit       = require('express-rate-limit');
const adminController = require('../controllers/adminController');

const adminLimiter = rateLimit({
    windowMs: 60 * 1000, max: 15, standardHeaders: true, legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ error: 'Too many administrative requests.' })
});

router.use(requireAuth);
router.use(requireRole('super_admin'));

router.get('/users',                     adminController.listUsers);
router.post('/users',                    adminLimiter, adminController.createUser);
router.post('/users/:id/role',           adminController.updateRole);
router.post('/users/:id/toggle',         adminController.toggleActive);
router.post('/users/:id/unlock',         adminController.unlockUser);
router.post('/users/:id/reset-password', adminLimiter, adminController.resetPassword);

module.exports = router;
