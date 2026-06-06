const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendor.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize, ROLES } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validation.middleware');
const {
	createVendorValidation,
	updateVendorValidation,
	listVendorValidation,
} = require('../validators/vendor.validator');

router.use(authenticate);

router.get('/',     authorize(ROLES.ADMIN, ROLES.PROCUREMENT_OFFICER, ROLES.MANAGER), listVendorValidation, validateRequest, vendorController.list);
router.get('/:id',  authorize(ROLES.ADMIN, ROLES.PROCUREMENT_OFFICER, ROLES.MANAGER), vendorController.getById);
router.post('/',    authorize(ROLES.ADMIN, ROLES.PROCUREMENT_OFFICER), createVendorValidation, validateRequest, vendorController.create);
router.put('/:id',  authorize(ROLES.ADMIN, ROLES.PROCUREMENT_OFFICER), updateVendorValidation, validateRequest, vendorController.update);
router.delete('/:id', authorize(ROLES.ADMIN), vendorController.remove);

module.exports = router;
