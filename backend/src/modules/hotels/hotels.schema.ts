import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, 'Expected ISO date');

export const hotelFeedQuerySchema = z.object({
  destination: z.string().min(1),
  checkIn: isoDate,
  checkOut: isoDate,
  environment: z.enum(['CITY', 'COUNTRY', 'SUBURB']).optional(),
});

export type HotelFeedQuery = z.infer<typeof hotelFeedQuerySchema>;
