const rfqService = require('../services/rfq.service');
const { sendSuccess } = require('../utils/response');
const { logActivity, notifyUser } = require('../utils/logger');
const supabase = require('../config/db');

exports.list = async (req, res, next) => {
  try {
    const result = await rfqService.list(req.query, req.user);
    return sendSuccess(res, 200, 'RFQs fetched', result.data, result.meta);
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const data = await rfqService.getById(req.params.id);
    return sendSuccess(res, 200, 'RFQ fetched', data);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const files = req.files || [];
    const data = await rfqService.create(req.body, files, req.user.id);
    
    // Audit Log
    await logActivity(req.user.id, `Created RFQ ${data.rfq_number}`, 'Sourcing', data.id, { title: data.title }, req.ip);

    // If published during creation
    if (data.status === 'published') {
      await logActivity(req.user.id, `Published RFQ ${data.rfq_number}`, 'Sourcing', data.id, { title: data.title }, req.ip);
      // Notify assigned vendors
      const { data: assignments } = await supabase
        .from('rfq_vendor_assignments')
        .select('vendor_id, vendors(user_id)')
        .eq('rfq_id', data.id);
      
      if (assignments) {
        for (const assign of assignments) {
          if (assign.vendors?.user_id) {
            await notifyUser(
              assign.vendors.user_id,
              'New RFQ Sourcing Request',
              `You have been invited to quote for RFQ ${data.rfq_number}: ${data.title}`,
              'rfq',
              data.id,
              'rfqs'
            );
          }
        }
      }
    }

    return sendSuccess(res, 201, 'RFQ created', data);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const files = req.files || [];
    const data = await rfqService.update(req.params.id, req.body, files);
    
    // Audit Log
    await logActivity(req.user.id, `Updated RFQ ${data.rfq_number}`, 'Sourcing', data.id, { status: data.status }, req.ip);

    return sendSuccess(res, 200, 'RFQ updated', data);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    // Get info for logs before deleting
    const rfq = await rfqService.getById(req.params.id);
    const result = await rfqService.remove(req.params.id);
    
    // Audit Log
    await logActivity(req.user.id, `Deleted RFQ ${rfq.rfq_number}`, 'Sourcing', req.params.id, {}, req.ip);

    return sendSuccess(res, 200, result.message);
  } catch (err) { next(err); }
};

exports.publish = async (req, res, next) => {
  try {
    const data = await rfqService.updateStatus(req.params.id, 'published');
    
    // Audit Log
    await logActivity(req.user.id, `Published RFQ ${data.rfq_number}`, 'Sourcing', data.id, {}, req.ip);

    // Notify assigned vendors
    const { data: assignments } = await supabase
      .from('rfq_vendor_assignments')
      .select('vendor_id, vendors(user_id)')
      .eq('rfq_id', data.id);
    
    if (assignments) {
      for (const assign of assignments) {
        if (assign.vendors?.user_id) {
          await notifyUser(
            assign.vendors.user_id,
            'New RFQ Sourcing Request',
            `You have been invited to quote for RFQ ${data.rfq_number}: ${data.title}`,
            'rfq',
            data.id,
            'rfqs'
          );
        }
      }
    }

    return sendSuccess(res, 200, 'RFQ published and vendors notified', data);
  } catch (err) { next(err); }
};

exports.close = async (req, res, next) => {
  try {
    const data = await rfqService.updateStatus(req.params.id, 'closed');
    
    // Audit Log
    await logActivity(req.user.id, `Closed RFQ ${data.rfq_number}`, 'Sourcing', data.id, {}, req.ip);

    return sendSuccess(res, 200, 'RFQ closed', data);
  } catch (err) { next(err); }
};
