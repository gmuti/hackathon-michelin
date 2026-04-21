import { z } from 'zod';

const arrayOrString = z.preprocess(
  (v) => (v === undefined ? undefined : Array.isArray(v) ? v : [v]),
  z.array(z.string()).optional(),
);

export const feedQuerySchema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  transportMode: z.enum(['walk', 'bike', 'car', 'train']),
  cuisineTypes: arrayOrString,
  dietaryRestrictions: arrayOrString,
});

export type FeedQuery = z.infer<typeof feedQuerySchema>;
