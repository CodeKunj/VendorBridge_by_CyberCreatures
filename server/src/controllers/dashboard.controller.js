const dashboardService = require('../services/dashboard.service');
const { sendSuccess } = require('../utils/response');

exports.getDashboard = async (req, res, next) => {
  try {
    const data = await dashboardService.getDashboardData();
    return sendSuccess(res, 200, 'Dashboard loaded', data);
  } catch (error) {
    return next(error);
  }
};