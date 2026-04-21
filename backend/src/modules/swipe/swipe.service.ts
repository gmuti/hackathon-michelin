import { prisma } from '../../config/prisma';
import { SwipeDto } from './swipe.schema';
import { handleSwipe as jamHandleSwipe } from '../jam/jam.service';

export async function recordSwipe(userId: string, dto: SwipeDto) {
  const { targetId, targetType, action, sessionId = null } = dto;

  // Postgres NULL != NULL so we can't rely on @@unique for null sessionId — use manual upsert
  const existing = await prisma.swipe.findFirst({
    where: { userId, targetId, targetType, sessionId },
  });

  const swipe = existing
    ? await prisma.swipe.update({ where: { id: existing.id }, data: { action } })
    : await prisma.swipe.create({ data: { userId, targetId, targetType, action, sessionId } });

  let jamResult = null;
  if (sessionId) {
    jamResult = await jamHandleSwipe(sessionId, targetId, action, userId);
  }

  return { swipe, jamResult };
}
