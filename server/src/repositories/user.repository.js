const BaseRepository = require('./base.repository');
const AppError = require('../errors/AppError');

class UserRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  async findByEmail(email, { includePassword = false, onlyActive = false } = {}) {
    const columns = includePassword
      ? '*'
      : 'id, name, email, role, status, avatar_url, last_login_at, created_at';

    let query = this.query().select(columns).eq('email', email.toLowerCase());

    if (onlyActive) {
      query = query.eq('status', 'active');
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new AppError(error.message, 400);
    }

    return data;
  }

  async findProfileById(id) {
    const { data, error } = await this.query()
      .select('id, name, email, role, status, avatar_url, last_login_at, created_at')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new AppError(error.message, 400);
    }

    return data;
  }

  async createUser(payload) {
    return this.create(payload);
  }

  async updateLastLogin(id) {
    const { error } = await this.query().update({ last_login_at: new Date().toISOString() }).eq('id', id);

    if (error) {
      throw new AppError(error.message, 400);
    }
  }

  async updatePassword(id, passwordHash) {
    const { error } = await this.query().update({ password_hash: passwordHash }).eq('id', id);

    if (error) {
      throw new AppError(error.message, 400);
    }
  }
}

module.exports = new UserRepository();