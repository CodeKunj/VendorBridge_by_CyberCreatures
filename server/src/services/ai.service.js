const { GoogleGenAI } = require('@google/genai');
const supabase = require('../config/db');
const env = require('../config/env');
const AppError = require('../errors/AppError');
const { decrypt } = require('../utils/crypto');
const { detectIntent, extractRfqNumber } = require('../utils/aiIntents');
const { fetchContext } = require('../utils/aiDataAggregator');

const SENSITIVE_AI_KEYS = ['gemini_api_key'];

// ─── Settings ─────────────────────────────────────────────────────────────────

const getAiSettings = async () => {
  const { data, error } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['ai_enabled', 'ai_model', 'ai_temperature', 'ai_max_tokens', 'gemini_api_key']);

  if (error) throw new AppError(error.message, 500);

  const map = {};
  (data || []).forEach((row) => { map[row.key] = row.value; });

  let geminiKey = null;
  if (map.gemini_api_key) {
    const decrypted = decrypt(map.gemini_api_key);
    geminiKey = decrypted || map.gemini_api_key;
  }

  return {
    enabled: map.ai_enabled === undefined || map.ai_enabled === null
      ? true
      : (map.ai_enabled !== false && map.ai_enabled !== 'false'),
    model: map.ai_model || env.aiModel || 'gemini-flash-latest',
    temperature: Number(map.ai_temperature ?? env.aiTemperature ?? 0.4),
    max_tokens: Number(map.ai_max_tokens ?? env.aiMaxTokens ?? 1024),
    gemini_api_key: geminiKey || env.geminiApiKey || null,
  };
};

// ─── Gemini call ──────────────────────────────────────────────────────────────

const sanitizeMessage = (message) => {
  if (!message || typeof message !== 'string') throw new AppError('Message is required', 400);
  return message.replace(/<[^>]*>/g, '').trim().slice(0, 2000);
};

const fallbackResponse = (intent, context) => {
  const data = context.data || {};
  const insights = context.insights || [];

  if (intent === 'dashboard_summary') {
    if (data.this_month_spend_formatted) {
      return (
        `Dashboard Summary:\n` +
        `- Total Vendors: ${data.total_vendors || 0}\n` +
        `- Published RFQs: ${data.published_rfqs || 0}\n` +
        `- Pending Approvals: ${data.pending_approvals || 0}\n` +
        `- Purchase Orders: ${data.purchase_orders || 0}\n` +
        `- Invoices: ${data.invoices || 0}\n` +
        `- This Month Spend: ${data.this_month_spend_formatted || 'Rs. 0.00'}`
      );
    }
    return (
      `Vendor Portal Summary:\n` +
      `- Assigned RFQs: ${data.assigned_rfqs || 0}\n` +
      `- My Quotations: ${data.my_quotations || 0}\n` +
      `- Purchase Orders: ${data.purchase_orders || 0}`
    );
  }
  if (intent === 'pending_approvals') return `There are ${data.count || 0} pending approval(s).`;
  if (intent === 'pending_rfqs') return `There are ${data.count || 0} active/pending RFQ(s).`;
  if (intent === 'invoice_summary') {
    return `Invoice Summary: ${data.unpaid_count || 0} unpaid, ${data.overdue_count || 0} overdue.`;
  }
  if (intent === 'monthly_spending') {
    return `This month's procurement spend is ${data.total_formatted || 'Rs. 0.00'}.`;
  }
  if (intent === 'quotation_comparison' && data.analysis) {
    const a = data.analysis;
    return (
      `Quotation comparison for ${data.rfq?.rfq_number || 'RFQ'}:\n` +
      `- Lowest price: ${a.lowest_price_vendor} (${a.lowest_price_inr} INR)\n` +
      `- Fastest delivery: ${a.fastest_delivery_vendor} (${a.fastest_delivery_days} days)`
    );
  }

  let text = JSON.stringify(data, null, 2).slice(0, 2000);
  if (insights.length) text += `\n\nInsights:\n- ${insights.join('\n- ')}`;
  return text;
};

const callGemini = async (message, role, userId, settings) => {
  const intent = detectIntent(message);
  const rfqNumber = extractRfqNumber(message);
  const context = await fetchContext(intent, role, userId, message, rfqNumber);

  const systemPrompt = `You are VendorBridge ERP Procurement Assistant — an enterprise copilot for procurement, vendors, RFQs, quotations, approvals, purchase orders, and invoices.

Rules:
- Answer using ONLY the ERP context data provided below.
- Use Indian Rupees (INR / Rs.) for all monetary values with Indian number formatting.
- Be concise, professional, and action-oriented.
- Respect role-based visibility; do not invent data.
- User role: ${role}
- Detected intent: ${intent}
- If data is empty, say so clearly and suggest a next step.

Context JSON:
${JSON.stringify(context, null, 2)}

User question:
${message}`;

  try {
    const ai = new GoogleGenAI({ apiKey: settings.gemini_api_key });
    const response = await ai.models.generateContent({
      model: settings.model,
      contents: systemPrompt,
      config: {
        temperature: settings.temperature,
        maxOutputTokens: settings.max_tokens,
      },
    });
    const reply = (response.text || '').trim() || fallbackResponse(intent, context);
    return { reply, intent, insights: context.insights || [], rfqNumber };
  } catch (err) {
    const reply = fallbackResponse(intent, context);
    return { reply, intent, insights: context.insights || [], rfqNumber };
  }
};

// ─── Chat history ─────────────────────────────────────────────────────────────

const saveChatHistory = async (userId, message, response, intent) => {
  const { error } = await supabase
    .from('ai_chat_history')
    .insert({ user_id: userId, message, response, intent: intent || null });
  if (error) console.warn('Failed to save AI chat history:', error.message);
};

const listChatHistory = async (userId, { page = 1, limit = 30, search = '' }) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('ai_chat_history')
    .select('id, message, response, intent, created_at', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (search) query = query.or(`message.ilike.%${search}%,response.ilike.%${search}%`);

  const { data, count, error } = await query;
  if (error) throw new AppError(error.message, 500);

  return {
    data: data || [],
    meta: { total: count || 0, page, limit, totalPages: Math.ceil((count || 0) / limit) },
  };
};

// ─── Main chat entry ──────────────────────────────────────────────────────────

const chat = async (user, rawMessage) => {
  const message = sanitizeMessage(rawMessage);
  const aiSettings = await getAiSettings();

  if (!aiSettings.enabled) {
    throw new AppError('AI Assistant is currently disabled by the administrator.', 503);
  }
  if (!aiSettings.gemini_api_key) {
    throw new AppError('Gemini API key is not configured. Please contact your administrator.', 503);
  }

  const { reply, intent, insights, rfqNumber } = await callGemini(
    message, user.role, user.id, aiSettings,
  );

  await saveChatHistory(user.id, message, reply, intent);

  return {
    reply,
    intent,
    insights,
    context_summary: { intent, rfq_number: rfqNumber || null },
  };
};

module.exports = { chat, listChatHistory, getAiSettings, SENSITIVE_AI_KEYS };
