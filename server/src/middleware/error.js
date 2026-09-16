import multer from 'multer';

export function notFound(req, res) {
  res.status(404).json({ message: `Not found: ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || 'Server error';

  if (err instanceof multer.MulterError) {
    status = 400;
    if (err.code === 'LIMIT_FILE_SIZE') message = 'File is too large';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON body';
  }

  if (status >= 500) console.error(err.details || err);
  res.status(status).json({ message: status >= 500 && process.env.NODE_ENV === 'production' ? 'Server error' : message });
}
