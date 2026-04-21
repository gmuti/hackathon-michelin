import { prisma } from '../../config/prisma';
import { Environment } from '@prisma/client';
import { HotelFeedQuery } from './hotels.schema';

function getDatesInRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endNorm = new Date(end);
  endNorm.setHours(0, 0, 0, 0);
  while (current <= endNorm) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export async function getHotelFeed(userId: string, query: HotelFeedQuery) {
  const { destination, checkIn, checkOut, environment } = query;

  const swiped = await prisma.swipe.findMany({
    where: { userId, targetType: 'HOTEL' },
    select: { targetId: true },
  });
  const swipedIds = swiped.map((s) => s.targetId);

  const hotels = await prisma.hotel.findMany({
    where: {
      ...(swipedIds.length > 0 ? { id: { notIn: swipedIds } } : {}),
      city: { contains: destination, mode: 'insensitive' },
      ...(environment ? { environment: environment as Environment } : {}),
    },
    include: { availabilities: true },
  });

  const dates = getDatesInRange(new Date(checkIn), new Date(checkOut));

  return hotels
    .filter((hotel) =>
      dates.every((date) => {
        const avail = hotel.availabilities.find((a) => isSameDay(new Date(a.date), date));
        return avail?.available === true;
      }),
    )
    .slice(0, 30);
}

export async function getHotelById(id: string) {
  const hotel = await prisma.hotel.findUnique({
    where: { id },
    include: { availabilities: { orderBy: { date: 'asc' } } },
  });

  if (!hotel) return null;

  const reviews = await prisma.review.findMany({
    where: { targetId: id, targetType: 'HOTEL', certified: true },
    include: { user: { select: { id: true, username: true, avatar: true, role: true } } },
    orderBy: { likes: 'desc' },
    take: 10,
  });

  return { ...hotel, reviews };
}
