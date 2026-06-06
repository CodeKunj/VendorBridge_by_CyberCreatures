const express = require('express');
const router = express.Router();
const quotationController = require('../controllers/quotation.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize, ROLES } = require('../middleware/rbac.middleware');

router.use(authenticate);

router.get('/',                     authorize(ROLES.ADMIN, ROLES.PROCUREMENT_OFFICER, ROLES.MANAGER, ROLES.VENDOR), quotationController.list);
router.get('/compare/:rfqId',       authorize(ROLES.ADMIN, ROLES.PROCUREMENT_OFFICER, ROLES.MANAGER), quotationController.compare);
router.get('/:id',                  quotationController.getById);
router.post('/',                    authorize(ROLES.VENDOR), quotationController.create);
router.put('/:id',                  authorize(ROLES.VENDOR), quotationController.update);
router.post('/:id/withdraw',        authorize(ROLES.VENDOR), quotationController.withdraw);

module.exports = router;
