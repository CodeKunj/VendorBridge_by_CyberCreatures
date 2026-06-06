const supabase = require('../config/db');
const env = require('../config/env');
const AppError = require('../errors/AppError');
const { decrypt } = require('../utils/encrypt');

const SENSITIVE_AI_KEYS = ['gemini_api_key'];

const sanitizeMessage = (message) => {
  if (!message || typeof message !== 'string') {
    throw new AppError('Message is required', 400);
  }
  return message
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, 2000);
};

const getAiSettings = async () => {
  const { data, error } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', [
      'ai_enabled',
      'ai_model',
      'ai_temperature',
      'ai_max_tokens',
      'gemini_api_key',
    ]);

  if (error) {
    throw new AppError(error.message, 500);
  }

  const map = {};
  (data || []).forEach((row) => {
    map[row.key] = row.value;
  });

  let geminiKey = null;
  if (map.gemini_api_key) {
    const decrypted = decrypt(map.gemini_api_key);
    geminiKey = decrypted || map.gemini_api_key;
  }

  return {
    enabled: map.ai_enabled === undefined || map.ai_enabled === null
      ? true
      : (map.ai_enabled !== false && map.ai_enabled !== 'false'),
    model: map.ai_model || process.env.AI_MODEL || 'gemini-2.0-flash',
    temperature: Number(map.ai_temperature ?? process.env.AI_TEMPERATURE ?? 0.4),
    max_tokens: Number(map.ai_max_tokens ?? process.env.AI_MAX_TOKENS ?? 1024),
    gemini_api_key: geminiKey || process.env.GEMINI_API_KEY || null,
  };
};

const callAiService = async ({ message, user, aiSettings }) => {
  const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  const secret = process.env.AI_SERVICE_SECRET || '';

  const response = await fetch(`${aiServiceUrl}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { 'X-AI-Service-Secret': secret } : {}),
    },
    body: JSON.stringify({
      message,
      user_id: user.id,
      role: user.role,
      config: {
        model: aiSettings.model,
        temperature: aiSettings.temperature,
        max_tokens: aiSettings.max_tokens,
        gemini_api_key: aiSettings.gemini_api_key,
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new AppError(payload.detail || payload.message || 'AI service unavailable', response.status || 502);
  }

  return payload;
};

const saveChatHistory = async (userId, message, response, intent) => {
  const { error } = await supabase.from('ai_chat_history').insert({
    user_id: userId,
    message,
    response,
    intent: intent || null,
  });

  if (error) {
    console.warn('Failed to save AI chat history:', error.message);
  }
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

  if (search) {
    query = query.or(`message.ilike.%${search}%,response.ilike.%${search}%`);
  }

  const { data, count, error } = await query;

  if (error) {
    throw new AppError(error.message, 500);
  }

  return {
    data: data || [],
    meta: {
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
};

const chat = async (user, rawMessage) => {
  const message = sanitizeMessage(rawMessage);
  const aiSettings = await getAiSettings();

  if (!aiSettings.enabled) {
    throw new AppError('AI Assistant is currently disabled by the administrator.', 503);
  }

  if (!aiSettings.gemini_api_key) {
    throw new AppError('Gemini API key is not configured. Please contact your administrator.', 503);
  }

  const result = await callAiService({ message, user, aiSettings });
  const reply = result.response || 'I could not generate a response. Please try again.';
  const intent = result.intent || null;

  await saveChatHistory(user.id, message, reply, intent);

  return {
    reply,
    intent,
    insights: result.insights || [],
    context_summary: result.context_summary || null,
  };
};

module.exports = {
  chat,
  listChatHistory,
  getAiSettings,
  SENSITIVE_AI_KEYS,
};
