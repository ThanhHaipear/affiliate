const AppError = require('../utils/app-error');
const { serialize } = require('../utils/api-response');

exports.notFoundHandler = (req, _res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

exports.errorHandler = (error, _req, res, _next) => {
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: error.message || 'Internal server error',
    details: error.details ? serialize(error.details) : null
  });
};
