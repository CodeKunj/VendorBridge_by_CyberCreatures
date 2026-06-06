const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize, ROLES } = require('../middleware/rbac.middleware');

router.use(authenticate);
router.use(authorize(ROLES.ADMIN));

router.get('/',              settingsController.getAll);
router.get('/:category',     settingsController.getByCategory);
router.put('/',              settingsController.update);
router.post('/test-email',   settingsController.testEmail);
router.get('/audit-logs',    settingsController.auditLogs);

module.exports = router;
