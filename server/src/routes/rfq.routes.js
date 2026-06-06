const express = require('express');
const router = express.Router();
const rfqController = require('../controllers/rfq.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize, ROLES } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validation.middleware');
const multer = require('multer');
const {
	createRfqValidation,
	updateRfqValidation,
	listRfqValidation,
} = require('../validators/rfq.validator');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticate);

router.get('/',              listRfqValidation, validateRequest, rfqController.list);
router.get('/:id',           rfqController.getById);
router.post('/',             authorize(ROLES.ADMIN, ROLES.PROCUREMENT_OFFICER), upload.array('attachments', 10), createRfqValidation, validateRequest, rfqController.create);
router.put('/:id',           authorize(ROLES.ADMIN, ROLES.PROCUREMENT_OFFICER), upload.array('attachments', 10), updateRfqValidation, validateRequest, rfqController.update);
router.delete('/:id',        authorize(ROLES.ADMIN, ROLES.PROCUREMENT_OFFICER), rfqController.remove);
router.post('/:id/publish',  authorize(ROLES.ADMIN, ROLES.PROCUREMENT_OFFICER), rfqController.publish);
router.post('/:id/close',    authorize(ROLES.ADMIN, ROLES.PROCUREMENT_OFFICER), rfqController.close);

module.exports = router;
