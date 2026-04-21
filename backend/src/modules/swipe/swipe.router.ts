import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { swipeSchema } from './swipe.schema';
import * as swipeService from './swipe.service';

export const swipeRouter = Router();

swipeRouter.use(authMiddleware);

swipeRouter.post(
  '/',
  validate(swipeSchema),
  asyncHandler(async (req, res) => {
    const { swipe, jamResult } = await swipeService.recordSwipe(req.user!.id, req.body);
    res.status(201).json({ data: { swipe, jamResult }, error: null });
  }),
);
