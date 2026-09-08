import type { ErrorRequestHandler } from 'express';

/**
 * Last-resort handler for anything a controller didn't anticipate (see
 * docs/standards/backend-standards.md "Error handling"). Never leaks internals -- stack traces,
 * file paths, raw exception messages -- to the client; those are logged server-side only.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' },
  });
};
