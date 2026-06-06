const AppError = require('../errors/AppError');
const vendorRepository = require('../repositories/vendor.repository');

const SELECT_COLUMNS = 'id, vendor_code, company_name, gst_number, contact_person, email, phone, address, category, status, created_at, updated_at';

class VendorService {
  async list(query = {}) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
    const search = (query.search || '').trim();
    const status = (query.status || '').trim();
    const category = (query.category || '').trim();

    const { data, count, error } = await vendorRepository
      .buildListQuery({ page, limit, search, status, category, columns: SELECT_COLUMNS });

    if (error) {
      throw new AppError(error.message, 400);
    }

    return {
      data: data || [],
      meta: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  async getById(id) {
    const vendor = await vendorRepository.findById(id, SELECT_COLUMNS);

    if (!vendor) {
      throw new AppError('Vendor not found', 404);
    }

    return vendor;
  }

  async create(payload) {
    const vendorCode = await vendorRepository.nextVendorCode();
    const vendor = await vendorRepository.create({
      vendor_code: vendorCode,
      company_name: payload.company_name,
      gst_number: payload.gst_number,
      contact_person: payload.contact_person,
      email: payload.email.toLowerCase(),
      phone: payload.phone,
      address: payload.address,
      category: payload.category,
      status: payload.status || 'pending_verification',
    }, SELECT_COLUMNS);

    return vendor;
  }

  async update(id, payload) {
    const existing = await vendorRepository.findById(id, '*');

    if (!existing) {
      throw new AppError('Vendor not found', 404);
    }

    const updateData = {
      company_name: payload.company_name !== undefined ? payload.company_name : existing.company_name,
      gst_number: payload.gst_number !== undefined ? payload.gst_number : existing.gst_number,
      contact_person: payload.contact_person !== undefined ? payload.contact_person : existing.contact_person,
      email: payload.email !== undefined ? payload.email.toLowerCase() : existing.email,
      phone: payload.phone !== undefined ? payload.phone : existing.phone,
      address: payload.address !== undefined ? payload.address : existing.address,
      category: payload.category !== undefined ? payload.category : existing.category,
      status: payload.status !== undefined ? payload.status : existing.status,
      updated_at: new Date().toISOString(),
    };

    return vendorRepository.updateById(id, updateData, SELECT_COLUMNS);
  }

  async remove(id) {
    const existing = await vendorRepository.findById(id, 'id');

    if (!existing) {
      throw new AppError('Vendor not found', 404);
    }

    await vendorRepository.deleteById(id);
    return { message: 'Vendor deleted successfully' };
  }
}

module.exports = new VendorService();