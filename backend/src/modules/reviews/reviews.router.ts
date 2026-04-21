import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { AppError } from '../../utils/AppError';
import { prisma } from '../../config/prisma';
import { recalculateRole } from '../users/users.service';

export const reviewsRouter = Router();

reviewsRouter.use(authMiddleware);

const certifyQrSchema = z.object({
  restaurantId: z.string().min(1),
  qrCode: z.string().min(1),
});

const createReviewSchema = z.object({
  targetId: z.string().min(1),
  targetType: z.enum(['RESTAURANT', 'HOTEL']),
  content: z.string().min(10),
  rating: z.number().min(0).max(5),
});

reviewsRouter.post(
  '/certify-qr',
  validate(certifyQrSchema),
  asyncHandler(async (req, res) => {
    const { restaurantId, qrCode } = req.body as z.infer<typeof certifyQrSchema>;

    const restaurant = await prisma.restaurant.findFirst({
      where: { id: restaurantId, qrCode },
    });
    if (!restaurant) throw new AppError('QR code invalide ou restaurant introuvable', 403);

    const visit = await prisma.visit.create({
      data: {
        userId: req.user!.id,
        restaurantId,
        certified: true,
        certMethod: 'qr_code',
        visitedAt: new Date(),
      },
    });

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { certifiedVisits: { increment: 1 } },
    });

    await recalculateRole(req.user!.id);

    res.status(201).json({ data: visit, error: null });
  }),
);

reviewsRouter.post(
  '/',
  validate(createReviewSchema),
  asyncHandler(async (req, res) => {
    const { targetId, targetType, content, rating } = req.body as z.infer<typeof createReviewSchema>;

    const certCount = await prisma.visit.count({
      where: { userId: req.user!.id, restaurantId: targetId, certified: true },
    });
    if (certCount < 1) {
      throw new AppError('Au moins 1 visite certifiée requise pour poster un avis', 403);
    }

    const review = await prisma.review.create({
      data: { userId: req.user!.id, targetId, targetType, content, rating, certified: true },
    });

    res.status(201).json({ data: review, error: null });
  }),
);

reviewsRouter.get(
  '/:targetType/:targetId',
  asyncHandler(async (req, res) => {
    const { targetType, targetId } = req.params;

    if (targetType !== 'RESTAURANT' && targetType !== 'HOTEL') {
      throw new AppError('targetType must be RESTAURANT or HOTEL', 400);
    }

    const reviews = await prisma.review.findMany({
      where: { targetId, targetType: targetType as 'RESTAURANT' | 'HOTEL', certified: true },
      include: { user: { select: { id: true, username: true, avatar: true, role: true } } },
      orderBy: { likes: 'desc' },
    });

    res.json({ data: reviews, error: null });
  }),
);
