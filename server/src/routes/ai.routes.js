const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validation.middleware');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const { chatValidation, historyValidation } = require('../validators/ai.validator');

router.use(authenticate);

router.get('/status', aiController.status);
router.get('/history', historyValidation, validateRequest, aiController.history);
router.post('/chat', aiRateLimiter, chatValidation, validateRequest, aiController.chat);

module.exports = router;
