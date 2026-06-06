const supabase = require('../config/db');

/**
 * Middleware that automatically logs every authenticated request to activity_logs
 */
const auditLog = (action, module) => async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = async (body) => {
    // Only log on success (2xx)
    if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
      try {
        await supabase.from('activity_logs').insert({
          user_id: req.user.id,
          action,
          module,
          entity_id: req.params.id || null,
          metadata: {
            method: req.method,
            path: req.path,
            body: req.method !== 'GET' ? req.body : undefined,
          },
          ip_address: req.ip,
        });
      } catch (err) {
        // Non-blocking: don't fail the request if audit log fails
        console.error('[AUDIT LOG ERROR]', err.message);
      }
    }
    return originalJson(body);
  };
  next();
};

module.exports = { auditLog };
