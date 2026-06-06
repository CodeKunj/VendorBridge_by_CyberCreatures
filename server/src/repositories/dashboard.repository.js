const BaseRepository = require('./base.repository');
const AppError = require('../errors/AppError');

class DashboardRepository extends BaseRepository {
  constructor() {
    super('purchase_orders');
  }

  async countRows(tableName, filters = []) {
    let query = this.queryFor(tableName).select('id', { count: 'exact', head: true });

    filters.forEach(({ field, method = 'eq', value }) => {
      query = query[method](field, value);
    });

    const { count, error } = await query;

    if (error) {
      throw new AppError(error.message, 400);
    }

    return count || 0;
  }

  async fetchRows(tableName, columns = '*', filters = [], orderBy = 'created_at', ascending = false, limit = null) {
    let query = this.queryFor(tableName).select(columns);

    filters.forEach(({ field, method = 'eq', value }) => {
      query = query[method](field, value);
    });

    if (orderBy) {
      query = query.order(orderBy, { ascending });
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new AppError(error.message, 400);
    }

    return data || [];
  }

  queryFor(tableName) {
    return new BaseRepository(tableName).query();
  }
}

module.exports = new DashboardRepository();