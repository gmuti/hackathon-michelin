import { prisma } from '../../config/prisma';
import { FeedQuery } from './restaurants.schema';

const TRANSPORT_RADIUS: Record<string, number> = {
  walk: 1,
  bike: 5,
  car: 30,
  train: 100,
};

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export async function getRestaurantFeed(userId: string, query: FeedQuery) {
  const { lat, lng, transportMode, cuisineTypes, dietaryRestrictions } = query;
  const radius = TRANSPORT_RADIUS[transportMode];

  const swiped = await prisma.swipe.findMany({
    where: { userId, targetType: 'RESTAURANT' },
    select: { targetId: true },
  });
  const swipedIds = swiped.map((s) => s.targetId);

  const candidates = await prisma.restaurant.findMany({
    where: {
      ...(swipedIds.length > 0 ? { id: { notIn: swipedIds } } : {}),
      ...(cuisineTypes?.length ? { cuisineType: { in: cuisineTypes } } : {}),
      ...(dietaryRestrictions?.length ? { dietaryOptions: { hasSome: dietaryRestrictions } } : {}),
    },
    include: { photos: { orderBy: { position: 'asc' } } },
  });

  return candidates
    .map((r) => ({ ...r, distance: haversine(lat, lng, r.lat, r.lng) }))
    .filter((r) => r.distance <= radius)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 30);
}

export async function getRestaurantById(id: string) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    include: {
      photos: { orderBy: { position: 'asc' } },
      dishes: true,
    },
  });

  if (!restaurant) return null;

  const reviews = await prisma.review.findMany({
    where: { targetId: id, targetType: 'RESTAURANT', certified: true },
    include: { user: { select: { id: true, username: true, avatar: true, role: true } } },
    orderBy: { likes: 'desc' },
    take: 10,
  });

  return { ...restaurant, reviews };
}
