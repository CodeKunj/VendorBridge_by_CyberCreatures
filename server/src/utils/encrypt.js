const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;

const getKey = () => {
  const key = process.env.ENCRYPTION_KEY || '';
  if (key.length < KEY_LENGTH) {
    return crypto.scryptSync(key, 'vendorbridge-salt', KEY_LENGTH);
  }
  return Buffer.from(key.slice(0, KEY_LENGTH));
};

const encrypt = (text) => {
  if (!text) return null;
  const iv = crypto.randomBytes(16);
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

const decrypt = (encryptedText) => {
  if (!encryptedText) return null;
  try {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return null;
  }
};

/**
 * Mask sensitive values like API keys
 * sk-abcdef1234 → sk-****1234
 */
const maskValue = (value) => {
  if (!value || value.length < 8) return '****';
  const start = value.slice(0, 4);
  const end = value.slice(-4);
  return `${start}${'*'.repeat(Math.max(4, value.length - 8))}${end}`;
};

module.exports = { encrypt, decrypt, maskValue };
