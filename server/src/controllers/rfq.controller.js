const rfqService = require('../services/rfq.service');
const { sendSuccess } = require('../utils/response');

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
    return sendSuccess(res, 201, 'RFQ created', data);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const files = req.files || [];
    const data = await rfqService.update(req.params.id, req.body, files);
    return sendSuccess(res, 200, 'RFQ updated', data);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const result = await rfqService.remove(req.params.id);
    return sendSuccess(res, 200, result.message);
  } catch (err) { next(err); }
};

exports.publish = async (req, res, next) => {
  try {
    const data = await rfqService.updateStatus(req.params.id, 'published');
    return sendSuccess(res, 200, 'RFQ published and vendors notified', data);
  } catch (err) { next(err); }
};

exports.close = async (req, res, next) => {
  try {
    const data = await rfqService.updateStatus(req.params.id, 'closed');
    return sendSuccess(res, 200, 'RFQ closed', data);
  } catch (err) { next(err); }
};
