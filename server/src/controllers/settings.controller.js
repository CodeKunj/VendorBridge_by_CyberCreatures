const supabase = require('../config/db');
const { createTransporter } = require('../config/mailer');
const { sendSuccess, sendError } = require('../utils/response');
const { encrypt, decrypt } = require('../utils/crypto');
const { logActivity } = require('../utils/logger');

const SENSITIVE_KEYS = [
  'smtp_password',
  'openai_api_key',
  'gemini_api_key',
  'whatsapp_api_key',
  'sms_gateway_api_key'
];

// Helper to mask secret keys: e.g. "my-secret-key" -> "my-s••••••••key"
const maskValue = (val) => {
  if (!val) return '';
  const str = String(val);
  if (str.length <= 8) return '••••••••';
  return `${str.slice(0, 4)}••••••••${str.slice(-4)}`;
};

exports.getAll = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('settings').select('*').order('category', { ascending: true });

    if (error) {
      throw error;
    }

    const processedSettings = (data || []).map(s => {
      let val = s.value;
      if (SENSITIVE_KEYS.includes(s.key)) {
        // Decrypt then mask
        const decrypted = decrypt(s.value);
        val = maskValue(decrypted);
      }
      return {
        ...s,
        value: val
      };
    });

    return sendSuccess(res, 200, 'Settings fetched', processedSettings);
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

    const processedSettings = (data || []).map(s => {
      let val = s.value;
      if (SENSITIVE_KEYS.includes(s.key)) {
        const decrypted = decrypt(s.value);
        val = maskValue(decrypted);
      }
      return {
        ...s,
        value: val
      };
    });

    return sendSuccess(res, 200, 'Settings fetched', processedSettings);
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { category, key, value } = req.body;

    let finalValue = value;

    if (SENSITIVE_KEYS.includes(key)) {
      // If the admin submitted a masked value, it means they didn't modify it
      if (String(value).includes('••••••••')) {
        // Fetch existing setting from DB
        const { data: existing } = await supabase
          .from('settings')
          .select('value')
          .eq('category', category)
          .eq('key', key)
          .single();

        if (existing) {
          finalValue = existing.value; // Keep the original encrypted value
        } else {
          finalValue = encrypt(''); // Fallback
        }
      } else {
        // Encrypt the new secret key value
        finalValue = encrypt(String(value));
      }
    }

    const { data, error } = await supabase
      .from('settings')
      .upsert({ category, key, value: finalValue, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Log this settings update event to the activity audit trail
    await logActivity(
      req.user.id,
      `Updated system settings key: ${key} in category: ${category}`,
      'System',
      { category, key },
      req.ip
    );

    // Send back the response with masked value
    const responseData = {
      ...data,
      value: SENSITIVE_KEYS.includes(key) ? maskValue(value) : value
    };

    return sendSuccess(res, 200, 'Settings updated successfully', responseData);
  } catch (error) {
    next(error);
  }
};

exports.testEmail = async (req, res, next) => {
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_FROM_EMAIL || 'no-reply@vendorbridge.com',
      to: req.body.email,
      subject: 'VendorBridge SMTP Test Dispatch',
      text: 'This is a secure verification email confirming SMTP settings within VendorBridge.',
    });

    await logActivity(
      req.user.id,
      `Triggered SMTP test email dispatch to ${req.body.email}`,
      'System',
      { recipient: req.body.email },
      req.ip
    );

    return sendSuccess(res, 200, 'Test email sent successfully');
  } catch (error) {
    next(error);
  }
};

exports.auditLogs = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*, users(name, email, role)')
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