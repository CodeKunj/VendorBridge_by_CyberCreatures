const BaseRepository = require('./base.repository');
const AppError = require('../errors/AppError');

class RfqRepository extends BaseRepository {
  constructor() {
    super('rfqs');
  }

  async nextRfqNumber() {
    const { count, error } = await this.query().select('id', { count: 'exact', head: true });

    if (error) {
      throw new AppError(error.message, 400);
    }

    const year = new Date().getFullYear();
    return `RFQ-${year}-${String((count || 0) + 1).padStart(4, '0')}`;
  }

  async replaceItems(rfqId, items = []) {
    const { error: deleteError } = await this.queryFor('rfq_items').delete().eq('rfq_id', rfqId);
    if (deleteError) {
      throw new AppError(deleteError.message, 400);
    }

    if (items.length === 0) {
      return;
    }

    const payload = items.map((item) => ({
      rfq_id: rfqId,
      product_name: item.item_name || item.product_name,  // frontend sends item_name
      quantity: item.quantity,
      unit: item.uom || item.unit || null,               // frontend sends uom
      notes: item.description || item.notes || null,     // frontend sends description
    }));

    const { error: insertError } = await this.queryFor('rfq_items').insert(payload);
    if (insertError) {
      throw new AppError(insertError.message, 400);
    }
  }

  async replaceAssignments(rfqId, vendorIds = []) {
    const { error: deleteError } = await this.queryFor('rfq_vendor_assignments').delete().eq('rfq_id', rfqId);
    if (deleteError) {
      throw new AppError(deleteError.message, 400);
    }

    if (vendorIds.length === 0) {
      return;
    }

    const payload = vendorIds.map((vendorId) => ({ rfq_id: rfqId, vendor_id: vendorId }));
    const { error: insertError } = await this.queryFor('rfq_vendor_assignments').insert(payload);
    if (insertError) {
      throw new AppError(insertError.message, 400);
    }
  }

  async addAttachments(rfqId, attachments = []) {
    if (attachments.length === 0) {
      return;
    }

    const payload = attachments.map((file) => ({
      rfq_id: rfqId,
      file_name: file.originalName,
      file_path: file.filePath,
      file_url: file.url,
      mime_type: file.mimeType,
      file_size: file.size,
    }));

    const { error } = await this.queryFor('rfq_attachments').insert(payload);
    if (error) {
      throw new AppError(error.message, 400);
    }
  }

  queryFor(tableName) {
    return new BaseRepository(tableName).query();
  }
}

module.exports = new RfqRepository();