const vendorService = require('../services/vendor.service');
const { sendSuccess } = require('../utils/response');

exports.list = async (req, res, next) => {
  try {
    const result = await vendorService.list(req.query);
    return sendSuccess(res, 200, 'Vendors fetched', result.data, result.meta);
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const data = await vendorService.getById(req.params.id);
    return sendSuccess(res, 200, 'Vendor fetched', data);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const data = await vendorService.create(req.body);
    return sendSuccess(res, 201, 'Vendor created', data);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const data = await vendorService.update(req.params.id, req.body);
    return sendSuccess(res, 200, 'Vendor updated', data);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const result = await vendorService.remove(req.params.id);
    return sendSuccess(res, 200, result.message);
  } catch (err) { next(err); }
};
