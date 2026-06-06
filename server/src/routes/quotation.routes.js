const express = require('express');
const router = express.Router();
const quotationController = require('../controllers/quotation.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize, ROLES } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validation.middleware');
const multer = require('multer');
const {
	createQuotationValidation,
	updateQuotationValidation,
	quotationListValidation,
} = require('../validators/quotation.validator');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticate);

router.get('/',                     authorize(ROLES.ADMIN, ROLES.PROCUREMENT_OFFICER, ROLES.MANAGER, ROLES.VENDOR), quotationListValidation, validateRequest, quotationController.list);
router.get('/compare/:rfqId',       authorize(ROLES.ADMIN, ROLES.PROCUREMENT_OFFICER, ROLES.MANAGER), quotationController.compare);
router.get('/:id',                  quotationController.getById);
router.post('/',                    authorize(ROLES.VENDOR), upload.array('attachments', 10), createQuotationValidation, validateRequest, quotationController.create);
router.put('/:id',                  authorize(ROLES.VENDOR), upload.array('attachments', 10), updateQuotationValidation, validateRequest, quotationController.update);
router.post('/:id/withdraw',        authorize(ROLES.VENDOR), quotationController.withdraw);

module.exports = router;
