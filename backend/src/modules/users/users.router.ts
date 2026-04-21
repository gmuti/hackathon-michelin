import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import * as usersService from './users.service';

export const usersRouter = Router();

usersRouter.use(authMiddleware);

const updateMeSchema = z.object({
  bio: z.string().optional(),
  username: z.string().min(2).optional(),
  cuisinePreferences: z.array(z.string()).optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
});

usersRouter.get(
  '/me',
  asyncHandler(async (req, res) => {
    const user = await usersService.getMe(req.user!.id);
    res.json({ data: user, error: null });
  }),
);

usersRouter.patch(
  '/me',
  validate(updateMeSchema),
  asyncHandler(async (req, res) => {
    const user = await usersService.updateMe(req.user!.id, req.body);
    res.json({ data: user, error: null });
  }),
);

usersRouter.get(
  '/me/collection',
  asyncHandler(async (req, res) => {
    const collection = await usersService.getCollection(req.user!.id);
    res.json({ data: collection, error: null });
  }),
);

usersRouter.post(
  '/:id/follow',
  asyncHandler(async (req, res) => {
    const follow = await usersService.followUser(req.user!.id, req.params.id);
    res.status(201).json({ data: follow, error: null });
  }),
);

usersRouter.delete(
  '/:id/follow',
  asyncHandler(async (req, res) => {
    await usersService.unfollowUser(req.user!.id, req.params.id);
    res.json({ data: { success: true }, error: null });
  }),
);
