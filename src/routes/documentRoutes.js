'use strict';
const express         = require('express');
const router          = express.Router();
const { requireAuth } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/rbacMiddleware');
const rateLimit       = require('express-rate-limit');
const docController   = require('../controllers/documentController');

router.use(requireAuth);
router.use(requireRole('super_admin', 'rh_manager', 'employee'));

router.get('/',       docController.listDocuments);
router.post('/',      docController.createDocument);
router.get('/:id',    docController.viewDocument);
router.put('/:id',    docController.updateDocument);
router.delete('/:id', docController.deleteDocument);

module.exports = router;
