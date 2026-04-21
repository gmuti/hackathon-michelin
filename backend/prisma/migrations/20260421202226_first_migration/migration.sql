-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLONGEUR', 'SERVEUR', 'COMMIS', 'SOUS_CHEF', 'CHEF', 'CHEF_ETOILE');

-- CreateEnum
CREATE TYPE "SwipeAction" AS ENUM ('LIKE', 'DISLIKE', 'SUPER_LIKE');

-- CreateEnum
CREATE TYPE "TargetType" AS ENUM ('RESTAURANT', 'HOTEL');

-- CreateEnum
CREATE TYPE "Environment" AS ENUM ('CITY', 'COUNTRY', 'SUBURB');

-- CreateEnum
CREATE TYPE "JamStatus" AS ENUM ('WAITING', 'ACTIVE', 'COMPLETED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "supabaseId" TEXT,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatar" TEXT,
    "bio" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'PLONGEUR',
    "certifiedVisits" INTEGER NOT NULL DEFAULT 0,
    "cuisinePreferences" TEXT[],
    "dietaryRestrictions" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Restaurant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "michelinStars" INTEGER NOT NULL DEFAULT 0,
    "cuisineType" TEXT NOT NULL,
    "priceRange" INTEGER NOT NULL,
    "dietaryOptions" TEXT[],
    "qrCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Restaurant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantPhoto" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "RestaurantPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dish" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION,
    "category" TEXT NOT NULL,
    "emoji" TEXT,

    CONSTRAINT "Dish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hotel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "environment" "Environment" NOT NULL,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "pricePerNight" DOUBLE PRECISION NOT NULL,
    "amenities" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hotel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotelAvailability" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "available" BOOLEAN NOT NULL,

    CONSTRAINT "HotelAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Swipe" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetType" "TargetType" NOT NULL,
    "action" "SwipeAction" NOT NULL,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Swipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "restaurantId" TEXT,
    "certified" BOOLEAN NOT NULL DEFAULT false,
    "certMethod" TEXT,
    "visitedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetType" "TargetType" NOT NULL,
    "content" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "certified" BOOLEAN NOT NULL DEFAULT false,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JamSession" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "targetType" "TargetType" NOT NULL,
    "status" "JamStatus" NOT NULL DEFAULT 'WAITING',
    "matchThreshold" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "shareCode" TEXT NOT NULL,
    "destination" TEXT,
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),

    CONSTRAINT "JamSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JamParticipant" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JamParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JamMatch" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetType" "TargetType" NOT NULL,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "isMatch" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JamMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_supabaseId_key" ON "User"("supabaseId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_followerId_followingId_key" ON "Follow"("followerId", "followingId");

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_qrCode_key" ON "Restaurant"("qrCode");

-- CreateIndex
CREATE UNIQUE INDEX "HotelAvailability_hotelId_date_key" ON "HotelAvailability"("hotelId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "JamSession_shareCode_key" ON "JamSession"("shareCode");

-- CreateIndex
CREATE UNIQUE INDEX "JamParticipant_sessionId_userId_key" ON "JamParticipant"("sessionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "JamMatch_sessionId_targetId_key" ON "JamMatch"("sessionId", "targetId");

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantPhoto" ADD CONSTRAINT "RestaurantPhoto_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dish" ADD CONSTRAINT "Dish_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelAvailability" ADD CONSTRAINT "HotelAvailability_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Swipe" ADD CONSTRAINT "Swipe_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JamParticipant" ADD CONSTRAINT "JamParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "JamSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JamParticipant" ADD CONSTRAINT "JamParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JamMatch" ADD CONSTRAINT "JamMatch_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "JamSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
