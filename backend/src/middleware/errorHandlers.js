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

  // An oversized body is the caller's mistake, not the server's. Reporting it
  // as a 500 both misleads the caller and buries a real error in the log.
  if (error.type === 'entity.too.large' || error.status === 413) {
    return res.status(413).json({ message: 'Request body is too large.' });
  }

  console.error(error);
  return res.status(500).json({ message: 'An unexpected server error occurred.' });
}

module.exports = {
  errorHandler,
  notFound
};