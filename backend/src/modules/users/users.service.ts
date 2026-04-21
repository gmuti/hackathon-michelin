import { prisma } from '../../config/prisma';
import { UserRole } from '@prisma/client';

const ROLE_THRESHOLDS: Array<{ role: UserRole; min: number }> = [
  { role: UserRole.CHEF_ETOILE, min: 50 },
  { role: UserRole.CHEF, min: 30 },
  { role: UserRole.SOUS_CHEF, min: 15 },
  { role: UserRole.COMMIS, min: 5 },
  { role: UserRole.SERVEUR, min: 1 },
  { role: UserRole.PLONGEUR, min: 0 },
];

export async function recalculateRole(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { certifiedVisits: true },
  });
  if (!user) return;
  const role = ROLE_THRESHOLDS.find((t) => user.certifiedVisits >= t.min)?.role ?? UserRole.PLONGEUR;
  await prisma.user.update({ where: { id: userId }, data: { role } });
}

export async function getMe(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: { select: { followers: true, followings: true, visits: true } },
    },
  });
}

export async function updateMe(
  userId: string,
  data: {
    bio?: string;
    username?: string;
    cuisinePreferences?: string[];
    dietaryRestrictions?: string[];
  },
) {
  return prisma.user.update({ where: { id: userId }, data });
}

export async function getCollection(userId: string) {
  return prisma.visit.findMany({
    where: { userId, certified: true },
    include: { restaurant: { include: { photos: true } } },
    orderBy: { visitedAt: 'desc' },
  });
}

export async function followUser(followerId: string, followingId: string) {
  return prisma.follow.upsert({
    where: { followerId_followingId: { followerId, followingId } },
    update: {},
    create: { followerId, followingId },
  });
}

export async function unfollowUser(followerId: string, followingId: string) {
  return prisma.follow.deleteMany({ where: { followerId, followingId } });
}
