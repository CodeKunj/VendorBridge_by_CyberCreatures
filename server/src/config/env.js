const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const Joi = require('joi');

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(5000),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:5173'),
  CORS_ORIGINS: Joi.string().allow('').default('http://localhost:5173'),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  RATE_LIMIT_WINDOW_MS: Joi.number().integer().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: Joi.number().integer().positive().default(200),
  AUTH_RATE_LIMIT_MAX: Joi.number().integer().positive().default(20),
  BCRYPT_SALT_ROUNDS: Joi.number().integer().min(10).max(15).default(12),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  PASSWORD_RESET_EXPIRES_IN: Joi.string().default('1h'),
  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_SERVICE_KEY: Joi.string().min(1).required(),
  SMTP_HOST: Joi.string().allow(''),
  SMTP_PORT: Joi.number().integer().positive().default(587),
  SMTP_USER: Joi.string().allow(''),
  SMTP_PASS: Joi.string().allow(''),
  SMTP_FROM_NAME: Joi.string().default('VendorBridge'),
  SMTP_FROM_EMAIL: Joi.string().email().allow('').default('noreply@vendorbridge.com'),
  ENCRYPTION_KEY: Joi.string().allow(''),
  SUPABASE_STORAGE_BUCKET: Joi.string().allow('').default('vendorbridge-files'),
  AI_SERVICE_URL: Joi.string().uri().allow('').default('http://localhost:8000'),
  AI_SERVICE_SECRET: Joi.string().allow(''),
  AI_MODEL: Joi.string().allow('').default('gemini-flash-latest'),
  AI_TEMPERATURE: Joi.number().min(0).max(2).default(0.4),
  AI_MAX_TOKENS: Joi.number().integer().min(256).max(8192).default(1024),
  GEMINI_API_KEY: Joi.string().allow(''),
}).unknown(true);

const { value, error } = schema.validate(process.env, { abortEarly: false });

if (error) {
  throw new Error(`Environment validation failed: ${error.message}`);
}

const corsOrigins = value.CORS_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

module.exports = {
  nodeEnv: value.NODE_ENV,
  port: Number(value.PORT),
  frontendUrl: value.FRONTEND_URL,
  corsOrigins: corsOrigins.length > 0 ? corsOrigins : [value.FRONTEND_URL],
  logLevel: value.LOG_LEVEL,
  rateLimitWindowMs: Number(value.RATE_LIMIT_WINDOW_MS),
  rateLimitMax: Number(value.RATE_LIMIT_MAX),
  authRateLimitMax: Number(value.AUTH_RATE_LIMIT_MAX),
  bcryptSaltRounds: Number(value.BCRYPT_SALT_ROUNDS),
  jwtSecret: value.JWT_SECRET,
  jwtExpiresIn: value.JWT_EXPIRES_IN,
  jwtRefreshSecret: value.JWT_REFRESH_SECRET,
  jwtRefreshExpiresIn: value.JWT_REFRESH_EXPIRES_IN,
  passwordResetExpiresIn: value.PASSWORD_RESET_EXPIRES_IN,
  supabaseUrl: value.SUPABASE_URL,
  supabaseServiceKey: value.SUPABASE_SERVICE_KEY,
  smtp: {
    host: value.SMTP_HOST,
    port: Number(value.SMTP_PORT),
    user: value.SMTP_USER,
    pass: value.SMTP_PASS,
    fromName: value.SMTP_FROM_NAME,
    fromEmail: value.SMTP_FROM_EMAIL,
  },
  encryptionKey: value.ENCRYPTION_KEY,
  supabaseStorageBucket: value.SUPABASE_STORAGE_BUCKET,
  aiServiceUrl: value.AI_SERVICE_URL,
  aiServiceSecret: value.AI_SERVICE_SECRET,
  aiModel: value.AI_MODEL,
  aiTemperature: Number(value.AI_TEMPERATURE),
  aiMaxTokens: Number(value.AI_MAX_TOKENS),
  geminiApiKey: value.GEMINI_API_KEY,
};