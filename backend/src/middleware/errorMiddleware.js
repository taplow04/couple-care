const errorHandler = (err, req, res, next) => {
  res.status(err.statusCode || 400).json({
    success: false,
    message: err.message,
  });
};

module.exports = errorHandler;
