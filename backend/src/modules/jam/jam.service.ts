import { randomBytes } from 'crypto';
import { prisma } from '../../config/prisma';
import { TargetType } from '@prisma/client';

export async function createSession(
  creatorId: string,
  dto: {
    targetType: TargetType;
    matchThreshold?: number;
    destination?: string;
    checkIn?: string;
    checkOut?: string;
  },
) {
  const shareCode = 'JAM-' + randomBytes(2).toString('hex').toUpperCase();

  const session = await prisma.jamSession.create({
    data: {
      creatorId,
      targetType: dto.targetType,
      matchThreshold: dto.matchThreshold ?? 1.0,
      shareCode,
      destination: dto.destination,
      checkIn: dto.checkIn ? new Date(dto.checkIn) : undefined,
      checkOut: dto.checkOut ? new Date(dto.checkOut) : undefined,
    },
  });

  await prisma.jamParticipant.create({ data: { sessionId: session.id, userId: creatorId } });

  return session;
}

export async function joinSession(sessionId: string, userId: string) {
  const session = await prisma.jamSession.findUnique({ where: { id: sessionId } });
  if (!session) return null;

  await prisma.jamParticipant.upsert({
    where: { sessionId_userId: { sessionId, userId } },
    update: {},
    create: { sessionId, userId },
  });

  return prisma.jamSession.findUnique({
    where: { id: sessionId },
    include: { participants: { include: { user: true } } },
  });
}

export async function startSession(sessionId: string) {
  return prisma.jamSession.update({
    where: { id: sessionId },
    data: { status: 'ACTIVE', startedAt: new Date() },
  });
}

export async function handleSwipe(
  sessionId: string,
  targetId: string,
  action: string,
  _userId: string,
) {
  const session = await prisma.jamSession.findUnique({
    where: { id: sessionId },
    include: { participants: true },
  });
  if (!session) throw new Error('Session not found');

  const likeCount = await prisma.swipe.count({
    where: { sessionId, targetId, action: { in: ['LIKE', 'SUPER_LIKE'] } },
  });

  const participantCount = session.participants.length;
  const isMatch = participantCount > 0 && likeCount / participantCount >= session.matchThreshold;

  const existing = await prisma.jamMatch.findUnique({
    where: { sessionId_targetId: { sessionId, targetId } },
  });

  const isNewMatch = isMatch && !existing?.isMatch;

  const match = await prisma.jamMatch.upsert({
    where: { sessionId_targetId: { sessionId, targetId } },
    update: { likeCount, isMatch },
    create: { sessionId, targetId, targetType: session.targetType, likeCount, isMatch },
  });

  return { match, isNewMatch, targetType: session.targetType };
}

export async function getSessionByShareCode(shareCode: string) {
  return prisma.jamSession.findUnique({
    where: { shareCode },
    include: { participants: { include: { user: true } } },
  });
}

export async function getResults(sessionId: string) {
  return prisma.jamMatch.findMany({
    where: { sessionId },
    orderBy: [{ isMatch: 'desc' }, { likeCount: 'desc' }],
  });
}
