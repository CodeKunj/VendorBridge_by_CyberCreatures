const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize, ROLES } = require('../middleware/rbac.middleware');

router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.MANAGER));

router.get('/dashboard',          reportController.dashboard);
router.get('/spending',           reportController.spending);
router.get('/vendor-performance', reportController.vendorPerformance);
router.get('/rfq-statistics',     reportController.rfqStatistics);
router.get('/spending/export',    reportController.exportSpending);

module.exports = router;
