const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authRateLimiter } = require('../middleware/rateLimiter');
const { validateRequest } = require('../middleware/validation.middleware');
const {
	loginValidation,
	signupValidation,
	refreshValidation,
	forgotPasswordValidation,
	resetPasswordValidation,
	logoutValidation,
} = require('../validators/auth.validator');

router.post('/login', authRateLimiter, loginValidation, validateRequest, authController.login);
router.post('/signup', authRateLimiter, signupValidation, validateRequest, authController.signup);
router.post('/refresh', refreshValidation, validateRequest, authController.refresh);
router.post('/logout', authenticate, logoutValidation, validateRequest, authController.logout);
router.post('/forgot-password', authRateLimiter, forgotPasswordValidation, validateRequest, authController.forgotPassword);
router.post('/reset-password', resetPasswordValidation, validateRequest, authController.resetPassword);
router.get('/me', authenticate, authController.me);

module.exports = router;
