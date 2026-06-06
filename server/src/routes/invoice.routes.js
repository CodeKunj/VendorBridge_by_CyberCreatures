const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoice.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize, ROLES } = require('../middleware/rbac.middleware');

router.use(authenticate);

router.get('/',           authorize(ROLES.ADMIN, ROLES.PROCUREMENT_OFFICER, ROLES.MANAGER), invoiceController.list);
router.get('/:id',        invoiceController.getById);
router.post('/',          authorize(ROLES.ADMIN, ROLES.PROCUREMENT_OFFICER), invoiceController.create);
router.get('/:id/pdf',    invoiceController.downloadPdf);
router.post('/:id/email', authorize(ROLES.ADMIN, ROLES.PROCUREMENT_OFFICER), invoiceController.sendEmail);
router.patch('/:id/status', authorize(ROLES.ADMIN, ROLES.PROCUREMENT_OFFICER), invoiceController.updateStatus);

module.exports = router;
