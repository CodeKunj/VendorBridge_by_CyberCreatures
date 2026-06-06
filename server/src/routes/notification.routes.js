const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/',                  notificationController.list);
router.patch('/:id/read',        notificationController.markRead);
router.patch('/mark-all-read',   notificationController.markAllRead);
router.delete('/:id',            notificationController.remove);

module.exports = router;
