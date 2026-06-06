const crypto = require('crypto');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const createToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

const createSessionToken = () => crypto.randomUUID();

module.exports = {
  hashToken,
  createToken,
  createSessionToken,
};