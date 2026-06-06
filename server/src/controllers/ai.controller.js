const aiService = require('../services/ai.service');
const { sendSuccess } = require('../utils/response');

exports.chat = async (req, res, next) => {
  try {
    const result = await aiService.chat(req.user, req.body.message);
    return sendSuccess(res, 200, 'AI response generated', result);
  } catch (err) {
    next(err);
  }
};

exports.history = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 30;
    const search = (req.query.search || '').trim();
    const result = await aiService.listChatHistory(req.user.id, { page, limit, search });
    return sendSuccess(res, 200, 'Chat history fetched', result.data, result.meta);
  } catch (err) {
    next(err);
  }
};

exports.status = async (req, res, next) => {
  try {
    const settings = await aiService.getAiSettings();
    return sendSuccess(res, 200, 'AI status fetched', {
      enabled: settings.enabled,
      model: settings.model,
    });
  } catch (err) {
    next(err);
  }
};
