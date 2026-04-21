import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) {
  console.error(err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ data: null, error: err.message });
    return;
  }

  const response: Record<string, unknown> = { data: null, error: 'Internal server error' };

  if (process.env.NODE_ENV === 'development' && err instanceof Error) {
    response.stack = err.stack;
  }

  res.status(500).json(response);
}
