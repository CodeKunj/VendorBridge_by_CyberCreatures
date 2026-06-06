const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approval.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize, ROLES } = require('../middleware/rbac.middleware');

router.use(authenticate);

router.get('/',         authorize(ROLES.ADMIN, ROLES.MANAGER), approvalController.list);
router.get('/history',  authorize(ROLES.ADMIN, ROLES.MANAGER), approvalController.history);
router.get('/:id',      authorize(ROLES.ADMIN, ROLES.MANAGER), approvalController.getById);
router.post('/',        authorize(ROLES.ADMIN, ROLES.MANAGER), approvalController.decide);

module.exports = router;
