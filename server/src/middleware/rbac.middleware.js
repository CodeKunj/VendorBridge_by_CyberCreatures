const AppError = require('../errors/AppError');

/**
 * Role-based access control middleware factory
 * @param {...string} allowedRoles - roles that are permitted
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError(`Access denied. Required role: ${allowedRoles.join(' or ')}`, 403));
    }
    next();
  };
};

// Shorthand role sets
const ROLES = {
  ADMIN: 'admin',
  PROCUREMENT_OFFICER: 'procurement_officer',
  VENDOR: 'vendor',
  MANAGER: 'manager',
};

module.exports = { authorize, ROLES };
