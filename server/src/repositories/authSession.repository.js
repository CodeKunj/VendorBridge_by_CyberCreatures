const BaseRepository = require('./base.repository');
const AppError = require('../errors/AppError');
const { hashToken } = require('../utils/token');

class AuthSessionRepository extends BaseRepository {
  constructor() {
    super('auth_sessions');
  }

  async createSession({
    id = null,
    userId,
    refreshToken,
    expiresAt,
    userAgent = null,
    ipAddress = null,
    deviceName = null,
  }) {
    return this.create({
      ...(id ? { id } : {}),
      user_id: userId,
      refresh_token_hash: hashToken(refreshToken),
      expires_at: expiresAt,
      user_agent: userAgent,
      ip_address: ipAddress,
      device_name: deviceName,
    });
  }

  async findActiveById(sessionId) {
    const { data, error } = await this.query()
      .select('*')
      .eq('id', sessionId)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) {
      throw new AppError(error.message, 400);
    }

    return data;
  }

  async findByUserId(userId) {
    const { data, error } = await this.query()
      .select('*')
      .eq('user_id', userId)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(error.message, 400);
    }

    return data || [];
  }

  async verifyRefreshToken(sessionId, refreshToken) {
    const session = await this.findActiveById(sessionId);

    if (!session) {
      return null;
    }

    return session.refresh_token_hash === hashToken(refreshToken) ? session : null;
  }

  async rotateRefreshToken(sessionId, refreshToken, expiresAt) {
    return this.updateById(sessionId, {
      refresh_token_hash: hashToken(refreshToken),
      expires_at: expiresAt,
      last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  async touch(sessionId) {
    return this.updateById(sessionId, {
      last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  async revokeSession(sessionId) {
    return this.updateById(sessionId, {
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  async revokeUserSessions(userId) {
    const { error } = await this.query()
      .update({
        revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .is('revoked_at', null);

    if (error) {
      throw new AppError(error.message, 400);
    }
  }
}

module.exports = new AuthSessionRepository();