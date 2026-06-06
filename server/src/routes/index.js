const express = require('express');
const router = express.Router();

router.use('/auth',           require('./auth.routes'));
router.use('/users',          require('./user.routes'));
router.use('/vendors',        require('./vendor.routes'));
router.use('/rfqs',           require('./rfq.routes'));
router.use('/quotations',     require('./quotation.routes'));
router.use('/approvals',      require('./approval.routes'));
router.use('/purchase-orders', require('./po.routes'));
router.use('/invoices',       require('./invoice.routes'));
router.use('/notifications',  require('./notification.routes'));
router.use('/reports',        require('./report.routes'));
router.use('/settings',       require('./settings.routes'));
router.use('/activity-logs',  require('./activityLog.routes'));
router.use('/dashboard',      require('./dashboard.routes'));
router.use('/ai',             require('./ai.routes'));
router.use('/health',         require('./health.routes'));

module.exports = router;
