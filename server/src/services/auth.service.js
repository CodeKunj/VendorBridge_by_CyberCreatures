const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const logger = require('../config/logger');
const AppError = require('../errors/AppError');
const userRepository = require('../repositories/user.repository');
const authSessionRepository = require('../repositories/authSession.repository');
const passwordResetRepository = require('../repositories/passwordReset.repository');
const { createTransporter } = require('../config/mailer');
const { createToken, createSessionToken } = require('../utils/token');
const { ROLE_VALUES } = require('../constants/roles');

const signAccessToken = (user, sessionId) => jwt.sign(
  {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    sid: sessionId,
    type: 'access',
  },
  env.jwtSecret,
  { expiresIn: env.jwtExpiresIn }
);

const signRefreshToken = (userId, sessionId) => jwt.sign(
  {
    id: userId,
    sid: sessionId,
    type: 'refresh',
  },
  env.jwtRefreshSecret,
  { expiresIn: env.jwtRefreshExpiresIn }
);

const normalizeUser = (user) => {
  if (!user) {
    return null;
  }

  const { password_hash: _passwordHash, ...safeUser } = user;
  return safeUser;
};

const durationToMs = (value) => {
  const match = /^([0-9]+)(ms|s|m|h|d)$/i.exec(String(value).trim());

  if (!match) {
    throw new AppError('Invalid duration format', 500);
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
};

const getClientContext = (req = {}) => ({
  userAgent: req.headers?.['user-agent'] || null,
  ipAddress: req.headers?.['x-forwarded-for'] || req.ip || null,
  deviceName: req.body?.deviceName || req.headers?.['x-device-name'] || null,
});

const buildAuthResponse = async (user, req = {}) => {
  const sessionId = createSessionToken();
  const refreshToken = signRefreshToken(user.id, sessionId);
  const accessToken = signAccessToken(user, sessionId);
  const expiresAt = new Date(Date.now() + durationToMs(env.jwtRefreshExpiresIn)).toISOString();
  const context = getClientContext(req);

  const session = await authSessionRepository.createSession({
    id: sessionId,
    userId: user.id,
    refreshToken,
    expiresAt,
    userAgent: context.userAgent,
    ipAddress: context.ipAddress,
    deviceName: context.deviceName,
  });

  return {
    user: normalizeUser(user),
    accessToken,
    refreshToken,
    session: {
      id: session.id,
      expiresAt: session.expires_at,
      deviceName: session.device_name,
      userAgent: session.user_agent,
      lastUsedAt: session.last_used_at,
    },
  };
};

class AuthService {
  async login({ email, password }, req = {}) {
    const user = await userRepository.findByEmail(email, { includePassword: true, onlyActive: true });

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    await userRepository.updateLastLogin(user.id);

    return buildAuthResponse(user, req);
  }

  async signup({ name, email, password, role = 'vendor' }, req = {}) {
    const existingUser = await userRepository.findByEmail(email, { includePassword: true });

    if (existingUser) {
      throw new AppError('Email already registered', 409);
    }

    if (!ROLE_VALUES.includes(role)) {
      throw new AppError('Invalid role selected', 400);
    }

    const passwordHash = await bcrypt.hash(password, env.bcryptSaltRounds);

    const newUser = await userRepository.createUser({
      name,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      role,
    });

    return buildAuthResponse(newUser, req);
  }

  async refresh(refreshToken) {
    let decoded;

    try {
      decoded = jwt.verify(refreshToken, env.jwtRefreshSecret);
    } catch (error) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    if (decoded.type !== 'refresh' || !decoded.sid) {
      throw new AppError('Invalid refresh token', 401);
    }

    const user = await userRepository.findById(decoded.id, '*');

    if (!user || user.status !== 'active') {
      throw new AppError('User not found', 401);
    }

    const session = await authSessionRepository.verifyRefreshToken(decoded.sid, refreshToken);

    if (!session || session.user_id !== user.id) {
      throw new AppError('Refresh session expired or revoked', 401);
    }

    const newRefreshToken = signRefreshToken(user.id, session.id);
    const accessToken = signAccessToken(user, session.id);

    await authSessionRepository.rotateRefreshToken(
      session.id,
      newRefreshToken,
      new Date(Date.now() + durationToMs(env.jwtRefreshExpiresIn)).toISOString()
    );

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async me(userId) {
    const user = await userRepository.findProfileById(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  async forgotPassword(email) {
    const user = await userRepository.findByEmail(email, { includePassword: false });

    if (!user) {
      return { message: 'If that email exists, a reset link was sent' };
    }

    const resetToken = createToken(32);
    const resetExpiry = new Date(Date.now() + durationToMs(env.passwordResetExpiresIn));

    await passwordResetRepository.createToken({
      userId: user.id,
      token: resetToken,
      expiresAt: resetExpiry.toISOString(),
    });

    if (env.smtp.host && env.smtp.user && env.smtp.pass) {
      try {
        const transporter = createTransporter();
        const resetUrl = `${env.frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

        await transporter.sendMail({
          from: `"${env.smtp.fromName}" <${env.smtp.fromEmail}>`,
          to: email,
          subject: 'VendorBridge - Password Reset',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1976d2;">Password Reset Request</h2>
              <p>Hi ${user.name},</p>
              <p>Click the button below to reset your password. This link expires in 1 hour.</p>
              <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #1976d2; color: white; text-decoration: none; border-radius: 4px;">Reset Password</a>
              <p style="color: #666; font-size: 12px; margin-top: 24px;">If you didn't request this, please ignore this email.</p>
            </div>
          `,
        });
      } catch (error) {
        logger.warn('Password reset email could not be sent', { error: error.message });
      }
    }

    return { message: 'If that email exists, a reset link was sent' };
  }

  async resetPassword({ token, email, newPassword }) {
    const tokenRow = await passwordResetRepository.findActiveByToken(token);

    if (!tokenRow) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    const user = await userRepository.findById(tokenRow.user_id, 'id, name, email, role, status');

    if (!user || user.email.toLowerCase() !== email.toLowerCase()) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, env.bcryptSaltRounds);
    await userRepository.updatePassword(user.id, passwordHash);
    await passwordResetRepository.markUsed(tokenRow.id);
    await authSessionRepository.revokeUserSessions(user.id);

    return { message: 'Password reset successful' };
  }

  async logout(user, session) {
    if (!session?.id) {
      throw new AppError('No active session found', 401);
    }

    await authSessionRepository.revokeSession(session.id);

    return {
      message: 'Logged out successfully',
      userId: user?.id || null,
    };
  }
}

module.exports = new AuthService();