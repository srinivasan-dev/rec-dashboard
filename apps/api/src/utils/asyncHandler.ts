import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Express 4 doesn't forward a rejected promise from an async handler to the error middleware
 * on its own -- without this, a thrown error inside an `async` route handler would crash the
 * process instead of producing a 500 response.
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
