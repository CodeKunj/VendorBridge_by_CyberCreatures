const express = require('express');
const router = express.Router();
const poController = require('../controllers/po.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize, ROLES } = require('../middleware/rbac.middleware');

router.use(authenticate);

router.get('/',          authorize(ROLES.ADMIN, ROLES.PROCUREMENT_OFFICER, ROLES.MANAGER, ROLES.VENDOR), poController.list);
router.get('/:id',       poController.getById);
router.post('/',         authorize(ROLES.ADMIN, ROLES.PROCUREMENT_OFFICER), poController.create);
router.get('/:id/pdf',   poController.downloadPdf);
router.patch('/:id/status', authorize(ROLES.ADMIN, ROLES.PROCUREMENT_OFFICER), poController.updateStatus);

module.exports = router;
