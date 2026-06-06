const rateLimit = require('express-rate-limit');
const env = require('../config/env');

// In development, skip all rate limiting to avoid false positives during local testing
const isDev = process.env.NODE_ENV === 'development' || env.nodeEnv === 'development';
const skipInDev = () => isDev;

const globalRateLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDev,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authRateLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDev,
  message: { success: false, message: 'Too many login attempts, please try again later.' },
  skipSuccessfulRequests: true,
});

const aiRateLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: Number(process.env.AI_RATE_LIMIT_MAX) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDev,
  message: { success: false, message: 'Too many AI requests, please try again later.' },
});

module.exports = { globalRateLimiter, authRateLimiter, aiRateLimiter };
