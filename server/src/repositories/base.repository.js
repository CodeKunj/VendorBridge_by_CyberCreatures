const supabase = require('../config/db');
const AppError = require('../errors/AppError');

class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
  }

  query() {
    return supabase.from(this.tableName);
  }

  async findById(id, columns = '*') {
    const { data, error } = await this.query().select(columns).eq('id', id).maybeSingle();

    if (error) {
      throw new AppError(error.message, 400);
    }

    return data;
  }

  async findMany({ columns = '*', filters = [], orderBy = null, ascending = false, range = null } = {}) {
    let query = this.query().select(columns, { count: 'exact' });

    filters.forEach(({ method, field, value }) => {
      query = query[method](field, value);
    });

    if (orderBy) {
      query = query.order(orderBy, { ascending });
    }

    if (range) {
      query = query.range(range.from, range.to);
    }

    const { data, count, error } = await query;

    if (error) {
      throw new AppError(error.message, 400);
    }

    return { data, count };
  }

  async create(payload, columns = '*') {
    const { data, error } = await this.query().insert(payload).select(columns).single();

    if (error) {
      throw new AppError(error.message, 400);
    }

    return data;
  }

  async updateById(id, payload, columns = '*') {
    const { data, error } = await this.query().update(payload).eq('id', id).select(columns).single();

    if (error) {
      throw new AppError(error.message, 400);
    }

    return data;
  }

  async deleteById(id) {
    const { error } = await this.query().delete().eq('id', id);

    if (error) {
      throw new AppError(error.message, 400);
    }
  }
}

module.exports = BaseRepository;