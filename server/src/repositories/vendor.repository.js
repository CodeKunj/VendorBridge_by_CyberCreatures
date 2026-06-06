const BaseRepository = require('./base.repository');
const AppError = require('../errors/AppError');

class VendorRepository extends BaseRepository {
  constructor() {
    super('vendors');
  }

  async nextVendorCode() {
    const { count, error } = await this.query().select('id', { count: 'exact', head: true });

    if (error) {
      throw new AppError(error.message, 400);
    }

    return `VND-${String((count || 0) + 1).padStart(4, '0')}`;
  }

  buildListQuery({ page, limit, search, status, category, columns = '*' }) {
    let query = this.query()
      .select(columns, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      const term = search.replaceAll(',', ' ');
      query = query.or([
        `vendor_code.ilike.%${term}%`,
        `company_name.ilike.%${term}%`,
        `gst_number.ilike.%${term}%`,
        `contact_person.ilike.%${term}%`,
        `email.ilike.%${term}%`,
        `phone.ilike.%${term}%`,
        `address.ilike.%${term}%`,
        `category.ilike.%${term}%`,
      ].join(','));
    }

    return query;
  }
}

module.exports = new VendorRepository();