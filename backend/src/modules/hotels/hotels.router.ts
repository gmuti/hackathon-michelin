import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { AppError } from '../../utils/AppError';
import { hotelFeedQuerySchema, HotelFeedQuery } from './hotels.schema';
import * as hotelsService from './hotels.service';

export const hotelsRouter = Router();

hotelsRouter.use(authMiddleware);

hotelsRouter.get(
  '/feed',
  validate(hotelFeedQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const hotels = await hotelsService.getHotelFeed(
      req.user!.id,
      req.query as unknown as HotelFeedQuery,
    );
    res.json({ data: hotels, error: null });
  }),
);

hotelsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const hotel = await hotelsService.getHotelById(req.params.id);
    if (!hotel) throw new AppError('Hotel not found', 404);
    res.json({ data: hotel, error: null });
  }),
);
