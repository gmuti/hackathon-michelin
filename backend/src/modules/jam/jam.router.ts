import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { AppError } from '../../utils/AppError';
import * as jamService from './jam.service';

export const jamRouter = Router();

jamRouter.use(authMiddleware);

const createSessionSchema = z.object({
  targetType: z.enum(['RESTAURANT', 'HOTEL']),
  matchThreshold: z.number().min(0).max(1).optional(),
  destination: z.string().optional(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
});

jamRouter.post(
  '/',
  validate(createSessionSchema),
  asyncHandler(async (req, res) => {
    const session = await jamService.createSession(req.user!.id, req.body);
    res.status(201).json({ data: session, error: null });
  }),
);

// GET /:shareCode — récupère session par code partage
jamRouter.get(
  '/:shareCode',
  asyncHandler(async (req, res) => {
    // Distinguish shareCode (starts with JAM-) from numeric-like IDs for /results
    const { shareCode } = req.params;
    const session = await jamService.getSessionByShareCode(shareCode);
    if (!session) throw new AppError('Session not found', 404);
    res.json({ data: session, error: null });
  }),
);

jamRouter.get(
  '/:id/results',
  asyncHandler(async (req, res) => {
    const results = await jamService.getResults(req.params.id);
    res.json({ data: results, error: null });
  }),
);
