import { NextFunction, Request, Response } from 'express';

interface HttpError extends Error {
  status?: number;
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: 'Not found' });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: HttpError, _req: Request, res: Response, _next: NextFunction) {
  const status = err.status ?? 500;
  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
  res.status(status).json({ error: err.message || 'Internal server error' });
}
