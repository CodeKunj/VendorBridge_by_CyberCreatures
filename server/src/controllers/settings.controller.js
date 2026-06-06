const supabase = require('../config/db');
const { createTransporter } = require('../config/mailer');
const { sendSuccess, sendError } = require('../utils/response');

exports.getAll = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('settings').select('*').order('category', { ascending: true });

    if (error) {
      throw error;
    }

    return sendSuccess(res, 200, 'Settings fetched', data || []);
  } catch (error) {
    next(error);
  }
};

exports.getByCategory = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('settings').select('*').eq('category', req.params.category);

    if (error) {
      throw error;
    }

    return sendSuccess(res, 200, 'Settings fetched', data || []);
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { category, key, value } = req.body;

    const { data, error } = await supabase
      .from('settings')
      .upsert({ category, key, value, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return sendSuccess(res, 200, 'Settings updated', data);
  } catch (error) {
    next(error);
  }
};

exports.testEmail = async (req, res, next) => {
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_FROM_EMAIL,
      to: req.body.email,
      subject: 'VendorBridge email test',
      text: 'This is a test email from VendorBridge.',
    });

    return sendSuccess(res, 200, 'Test email sent');
  } catch (error) {
    next(error);
  }
};

exports.auditLogs = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    return sendSuccess(res, 200, 'Audit logs fetched', data || []);
  } catch (error) {
    next(error);
  }
};