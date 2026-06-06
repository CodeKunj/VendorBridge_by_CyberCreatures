const express = require('express');
const router = express.Router();
const activityLogController = require('../controllers/activityLog.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize, ROLES } = require('../middleware/rbac.middleware');

router.use(authenticate);

router.get('/', authorize(ROLES.ADMIN), activityLogController.list);

module.exports = router;
