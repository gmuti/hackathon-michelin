import { z } from 'zod';

export const swipeSchema = z.object({
  targetId: z.string().min(1),
  targetType: z.enum(['RESTAURANT', 'HOTEL']),
  action: z.enum(['LIKE', 'DISLIKE', 'SUPER_LIKE']),
  sessionId: z.string().optional(),
});

export type SwipeDto = z.infer<typeof swipeSchema>;
