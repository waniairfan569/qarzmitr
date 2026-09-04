function notFound(req, res) {
  return res.status(404).json({ message: 'Route not found.' });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ message: 'Request body contains invalid JSON.' });
  }

  console.error(error);
  return res.status(500).json({ message: 'An unexpected server error occurred.' });
}

module.exports = {
  errorHandler,
  notFound
};