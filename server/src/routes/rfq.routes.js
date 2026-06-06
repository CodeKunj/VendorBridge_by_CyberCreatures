const express = require('express');
const router = express.Router();
const rfqController = require('../controllers/rfq.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize, ROLES } = require('../middleware/rbac.middleware');

router.use(authenticate);

router.get('/',              rfqController.list);
router.get('/:id',           rfqController.getById);
router.post('/',             authorize(ROLES.ADMIN, ROLES.PROCUREMENT_OFFICER), rfqController.create);
router.put('/:id',           authorize(ROLES.ADMIN, ROLES.PROCUREMENT_OFFICER), rfqController.update);
router.delete('/:id',        authorize(ROLES.ADMIN, ROLES.PROCUREMENT_OFFICER), rfqController.remove);
router.post('/:id/publish',  authorize(ROLES.ADMIN, ROLES.PROCUREMENT_OFFICER), rfqController.publish);
router.post('/:id/close',    authorize(ROLES.ADMIN, ROLES.PROCUREMENT_OFFICER), rfqController.close);

module.exports = router;
