const jwt = require('jsonwebtoken');
const AppError = require('../errors/AppError');
const env = require('../config/env');
const authSessionRepository = require('../repositories/authSession.repository');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('No token provided', 401));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    if (!decoded.sid) {
      return next(new AppError('Invalid token session', 401));
    }

    const session = await authSessionRepository.findActiveById(decoded.sid);

    if (!session || session.user_id !== decoded.id) {
      return next(new AppError('Session expired or revoked', 401));
    }

    req.user = decoded;
    req.session = session;
    await authSessionRepository.touch(session.id);
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Token expired', 401));
    }
    return next(new AppError('Invalid token', 401));
  }
};

const optionalAuthenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.jwtSecret);

    if (decoded.sid) {
      const session = await authSessionRepository.findActiveById(decoded.sid);

      if (session && session.user_id === decoded.id) {
        req.user = decoded;
        req.session = session;
        return next();
      }
    }

    req.user = null;
  } catch (error) {
    req.user = null;
  }

  return next();
};

module.exports = { authenticate, optionalAuthenticate };
