const { ValidationError } = require('../utils/appError');

/**
 * Higher-order request validation middleware
 * Executes a validation callback against `req` and forwards a ValidationError if violations occur.
 * 
 * @param {(req: import('express').Request) => Array<string> | null} validatorFn
 * @returns {import('express').RequestHandler}
 */
const validate = (validatorFn) => {
  return (req, res, next) => {
    try {
      const errors = validatorFn(req);
      if (Array.isArray(errors) && errors.length > 0) {
        return next(new ValidationError('Request validation failed', errors));
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = validate;
