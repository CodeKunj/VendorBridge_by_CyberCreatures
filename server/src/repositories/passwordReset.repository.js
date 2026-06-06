const BaseRepository = require('./base.repository');
const AppError = require('../errors/AppError');
const { hashToken } = require('../utils/token');

class PasswordResetRepository extends BaseRepository {
  constructor() {
    super('password_reset_tokens');
  }

  async createToken({ userId, token, expiresAt }) {
    return this.create({
      user_id: userId,
      token_hash: hashToken(token),
      expires_at: expiresAt,
    });
  }

  async findActiveByToken(token) {
    const tokenHash = hashToken(token);
    const { data, error } = await this.query()
      .select('*')
      .eq('token_hash', tokenHash)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) {
      throw new AppError(error.message, 400);
    }

    return data;
  }

  async markUsed(tokenId) {
    return this.updateById(tokenId, {
      used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  async revokeUserTokens(userId) {
    const { error } = await this.query()
      .update({
        used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .is('used_at', null);

    if (error) {
      throw new AppError(error.message, 400);
    }
  }
}

module.exports = new PasswordResetRepository();