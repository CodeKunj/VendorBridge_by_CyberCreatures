const rfqRepository = require('../repositories/rfq.repository');
const vendorRepository = require('../repositories/vendor.repository');
const AppError = require('../errors/AppError');
const { uploadFileToStorage, removeFileFromStorage } = require('../utils/storage');

const SELECT_COLUMNS = `
  id,
  rfq_number,
  title,
  description,
  deadline,
  status,
  created_by,
  created_at,
  updated_at,
  rfq_items(*),
  rfq_attachments(*),
  rfq_vendor_assignments(vendor_id, vendors(id, vendor_code, company_name, status))
`;

const parseJsonField = (value, fallback = []) => {
  if (!value) {
    return fallback;
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      throw new AppError(`Invalid JSON payload for ${value}`, 400);
    }
  }

  return fallback;
};

class RfqService {
  async list(query = {}, user) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
    const search = (query.search || '').trim();
    const status = (query.status || '').trim();

    let rfqQuery = rfqRepository.query()
      .select(SELECT_COLUMNS, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status) {
      rfqQuery = rfqQuery.eq('status', status);
    }

    if (search) {
      rfqQuery = rfqQuery.or(`title.ilike.%${search}%,rfq_number.ilike.%${search}%`);
    }

    if (user?.role === 'vendor') {
      const vendor = await vendorRepository.query().select('id').eq('user_id', user.id).maybeSingle();

      if (vendor?.data?.id) {
        const { data: assignments } = await rfqRepository.queryFor('rfq_vendor_assignments').select('rfq_id').eq('vendor_id', vendor.data.id);
        const rfqIds = assignments?.map((assignment) => assignment.rfq_id) || [];

        if (rfqIds.length === 0) {
          return {
            data: [],
            meta: { total: 0, page, limit, totalPages: 0 },
          };
        }

        rfqQuery = rfqQuery.in('id', rfqIds);
      }
    }

    const { data, count, error } = await rfqQuery;

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
    const { data, error } = await rfqRepository.query().select(SELECT_COLUMNS).eq('id', id).maybeSingle();

    if (error) {
      throw new AppError(error.message, 400);
    }

    if (!data) {
      throw new AppError('RFQ not found', 404);
    }

    return data;
  }

  async create(payload, files = [], userId) {
    const rfqNumber = await rfqRepository.nextRfqNumber();
    const items = parseJsonField(payload.items, []);
    const vendorIds = parseJsonField(payload.vendor_ids || payload.vendorIds, []);
    const attachments = [];

    const rfq = await rfqRepository.create({
      rfq_number: rfqNumber,
      title: payload.title,
      description: payload.description || null,
      deadline: payload.deadline,
      status: payload.status || 'draft',
      created_by: userId,
    }, 'id, rfq_number, title, description, deadline, status, created_by, created_at, updated_at');

    for (const file of files) {
      const stored = await uploadFileToStorage(file, 'rfqs');
      attachments.push(stored);
    }

    await rfqRepository.replaceItems(rfq.id, items);
    await rfqRepository.replaceAssignments(rfq.id, vendorIds);
    await rfqRepository.addAttachments(rfq.id, attachments);

    return this.getById(rfq.id);
  }

  async update(id, payload, files = []) {
    await this.getById(id);

    const items = payload.items ? parseJsonField(payload.items, []) : null;
    const vendorIds = (payload.vendor_ids || payload.vendorIds) ? parseJsonField(payload.vendor_ids || payload.vendorIds, []) : null;
    const attachments = [];

    const rfq = await rfqRepository.updateById(id, {
      title: payload.title,
      description: payload.description || null,
      deadline: payload.deadline,
      status: payload.status,
      updated_at: new Date().toISOString(),
    }, 'id, rfq_number, title, description, deadline, status, created_by, created_at, updated_at');

    for (const file of files) {
      const stored = await uploadFileToStorage(file, 'rfqs');
      attachments.push(stored);
    }

    if (items !== null) {
      await rfqRepository.replaceItems(rfq.id, items);
    }

    if (vendorIds !== null) {
      await rfqRepository.replaceAssignments(rfq.id, vendorIds);
    }

    if (attachments.length > 0) {
      await rfqRepository.addAttachments(rfq.id, attachments);
    }

    return this.getById(rfq.id);
  }

  async updateStatus(id, status) {
    await this.getById(id);

    const data = await rfqRepository.updateById(id, {
      status,
      updated_at: new Date().toISOString(),
    }, 'id, rfq_number, title, description, deadline, status, created_by, created_at, updated_at');

    return data;
  }

  async remove(id) {
    const rfq = await this.getById(id);

    for (const attachment of rfq.rfq_attachments || []) {
      await removeFileFromStorage(attachment.file_path);
    }

    await rfqRepository.deleteById(id);

    return { message: 'RFQ deleted successfully' };
  }
}

module.exports = new RfqService();