import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { AppError } from '../../utils/AppError';
import { feedQuerySchema, FeedQuery } from './restaurants.schema';
import * as restaurantsService from './restaurants.service';

export const restaurantsRouter = Router();

restaurantsRouter.use(authMiddleware);

restaurantsRouter.get(
  '/feed',
  validate(feedQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const restaurants = await restaurantsService.getRestaurantFeed(
      req.user!.id,
      req.query as unknown as FeedQuery,
    );
    res.json({ data: restaurants, error: null });
  }),
);

restaurantsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const restaurant = await restaurantsService.getRestaurantById(req.params.id);
    if (!restaurant) throw new AppError('Restaurant not found', 404);
    res.json({ data: restaurant, error: null });
  }),
);
