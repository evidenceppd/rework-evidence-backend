'use strict';

const { AppError } = require('../utils/errors');

/**
 * Express middleware factory that restricts access to users with specific roles.
 * Must be used AFTER requireAuth so that req.adminRole is populated.
 *
 * @param {...string} roles - Allowed roles (e.g. 'MASTER', 'ADMIN')
 */
function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.adminRole) {
      return next(new AppError('Authentication required', 401));
    }
    if (!roles.includes(req.adminRole)) {
      return next(new AppError('Insufficient permissions', 403));
    }
    next();
  };
}

module.exports = { requireRole };
