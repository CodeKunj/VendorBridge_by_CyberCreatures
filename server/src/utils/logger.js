const supabase = require('../config/db');

/**
 * Creates a notification in the database for a specific user.
 * @param {string} userId - ID of the user to receive the notification
 * @param {string} title - Title of the notification
 * @param {string} message - Message body of the notification
 * @param {string} type - Notification category (rfq, quotation, approval, po, invoice, system)
 * @param {string} [entityId] - Optional associated record ID
 * @param {string} [entityType] - Optional associated record table name
 */
const notifyUser = async (userId, title, message, type, entityId = null, entityType = null) => {
  try {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        entity_id: entityId,
        entity_type: entityType,
        created_at: new Date().toISOString()
      })
      .select('*')
      .single();
    
    if (error) {
      console.error('Failed to create notification:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Error in notifyUser utility:', err);
    return null;
  }
};

/**
 * Logs a user action into the activity logs database.
 * @param {string} userId - ID of the user performing the action
 * @param {string} action - Action description (e.g. Created RFQ, Submitted Quotation)
 * @param {string} module - ERP Module (e.g. Sourcing, Billing, Purchasing)
 * @param {string} [entityId] - Optional associated record ID
 * @param {object} [metadata] - Optional additional metadata parameters
 * @param {string} [ipAddress] - Optional IP address
 */
const logActivity = async (userId, action, module, entityId = null, metadata = {}, ipAddress = null) => {
  try {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: userId,
        action,
        module,
        entity_id: entityId,
        metadata: metadata || {},
        ip_address: ipAddress || null,
        created_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (error) {
      console.error('Failed to write activity log:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Error in logActivity utility:', err);
    return null;
  }
};

module.exports = {
  notifyUser,
  logActivity
};
