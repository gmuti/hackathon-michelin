import { Server, Socket } from 'socket.io';
import { prisma } from '../../config/prisma';
import * as jamService from './jam.service';

interface JamJoinPayload {
  shareCode: string;
  userId: string;
}

interface JamSwipePayload {
  shareCode: string;
  sessionId: string;
  targetId: string;
  targetType: string;
  action: string;
  userId: string;
}

export function setupJamGateway(io: Server) {
  const jam = io.of('/jam');

  jam.on('connection', (socket: Socket) => {
    socket.on('jam:join', async ({ shareCode, userId }: JamJoinPayload) => {
      const session = await jamService.getSessionByShareCode(shareCode);
      if (!session) return;

      socket.join(shareCode);
      await jamService.joinSession(session.id, userId);
      socket.to(shareCode).emit('jam:participant_joined', { userId, shareCode });
    });

    socket.on('jam:start', ({ shareCode }: { shareCode: string }) => {
      let count = 3;
      const interval = setInterval(() => {
        jam.to(shareCode).emit('jam:countdown_tick', { count });
        count--;
        if (count < 0) {
          clearInterval(interval);
          jam.to(shareCode).emit('jam:start_swipe');
        }
      }, 1000);
    });

    socket.on('jam:swipe', async (payload: JamSwipePayload) => {
      const { shareCode, sessionId, targetId, targetType, action, userId } = payload;

      // Record swipe in DB
      const existing = await prisma.swipe.findFirst({
        where: { userId, targetId, targetType: targetType as 'RESTAURANT' | 'HOTEL', sessionId },
      });
      if (existing) {
        await prisma.swipe.update({ where: { id: existing.id }, data: { action: action as 'LIKE' | 'DISLIKE' | 'SUPER_LIKE' } });
      } else {
        await prisma.swipe.create({
          data: { userId, targetId, targetType: targetType as 'RESTAURANT' | 'HOTEL', action: action as 'LIKE' | 'DISLIKE' | 'SUPER_LIKE', sessionId },
        });
      }

      if (action === 'LIKE' || action === 'SUPER_LIKE') {
        socket.to(shareCode).emit('jam:liked_card', { targetId, likedBy: userId });
      }

      const { isNewMatch } = await jamService.handleSwipe(sessionId, targetId, action, userId);

      if (isNewMatch) {
        jam.to(shareCode).emit('jam:match', { targetId, targetType });
      }
    });

    socket.on('jam:leave', ({ shareCode }: { shareCode: string }) => {
      socket.leave(shareCode);
    });
  });
}
