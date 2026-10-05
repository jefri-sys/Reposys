const errorHandler = (err, req, res, next) => {
  // Log the full error details server-side using console.error
  console.error('[errorHandler]', err);

  if (err.name === 'ValidationError') {
    const firstMessage = Object.values(err.errors || {})[0]?.message || 'Validation failed.';
    return res.status(400).json({
      success: false,
      message: firstMessage,
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid request.',
    });
  }

  // MongoDB duplicate key error (E11000)
  if (
    (err.name === 'MongoServerError' || err.name === 'MongoError')
    && err.code === 11000
  ) {
    const isProdE = process.env.NODE_ENV === 'production';
    return res.status(409).json({
      success: false,
      message: 'A record with those details already exists.',
      ...(isProdE ? {} : { keyValue: err.keyValue, keyPattern: err.keyPattern, detail: err.message })
    });
  }

  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  // In development expose the real error so devs can read it in the browser Network tab
  if (!isProd) {
    return res.status(status).json({
      success: false,
      message: err.message || 'Something went wrong.',
      errorName: err.name,
      errorCode: err.code,
    });
  }

  const message = status >= 500
    ? 'Something went wrong. Please try again.'
    : (err.message || 'Something went wrong. Please try again.');

  return res.status(status).json({
    success: false,
    message,
  });
};

module.exports = errorHandler;

