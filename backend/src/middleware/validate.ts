import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export function validate(schema: ZodSchema, source: 'body' | 'query' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(source === 'body' ? req.body : req.query);
    if (!result.success) {
      res.status(400).json({ data: null, error: result.error.flatten() });
      return;
    }
    if (source === 'body') req.body = result.data;
    else (req as Request & { query: unknown }).query = result.data as Record<string, string>;
    next();
  };
}
