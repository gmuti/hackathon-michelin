// ─── Enums ──────────────────────────────────────────────────────────────────

export type UserRole = 'PLONGEUR' | 'SERVEUR' | 'COMMIS' | 'SOUS_CHEF' | 'CHEF' | 'CHEF_ETOILE';
export type SwipeAction = 'LIKE' | 'DISLIKE' | 'SUPER_LIKE';
export type TargetType = 'RESTAURANT' | 'HOTEL';
export type JamStatus = 'WAITING' | 'ACTIVE' | 'COMPLETED';
export type TransportMode = 'walk' | 'bike' | 'car' | 'train';
export type Environment = 'CITY' | 'COUNTRY' | 'SUBURB';

// ─── Domain ─────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  bio?: string;
  role: UserRole;
  certifiedVisits: number;
  reliabilityScore: number;
  cuisinePreferences: string[];
  dietaryRestrictions: string[];
}

export interface Restaurant {
  id: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  michelinStars: number;
  cuisineType: string;
  priceRange: number; // 1-4
  dietaryOptions: string[];
  photos: Photo[];
  dishes: Dish[];
}

export interface Hotel {
  id: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  environment: Environment;
  stars: number;
  pricePerNight: number;
  amenities: string[];
  photos: Photo[];
}

export interface Photo {
  id: string;
  url: string;
  position: number;
}

export interface Dish {
  id: string;
  name: string;
  description?: string;
  price?: number;
  category: string; // emoji category
  photos: Photo[];
}

export interface Review {
  id: string;
  userId: string;
  user: Pick<User, 'id' | 'username' | 'avatar' | 'role'>;
  targetId: string;
  targetType: TargetType;
  content: string;
  rating: number;
  certified: boolean;
  likes: number;
}

export interface JamSession {
  id: string;
  creatorId: string;
  targetType: TargetType;
  status: JamStatus;
  matchThreshold: number;
  shareCode: string;
  participants: JamParticipant[];
  matches: JamMatch[];
}

export interface JamParticipant {
  id: string;
  userId: string;
  user: Pick<User, 'id' | 'username' | 'avatar'>;
}

export interface JamMatch {
  id: string;
  targetId: string;
  targetType: TargetType;
  likeCount: number;
  isMatch: boolean;
}

// ─── API DTOs ────────────────────────────────────────────────────────────────

export interface RestaurantFeedQuery {
  lat: number;
  lng: number;
  transportMode?: TransportMode;
  cuisineTypes?: string[];
  dietaryRestrictions?: string[];
}

export interface HotelFeedQuery {
  destination: string;
  checkIn: string;
  checkOut: string;
  environment?: Environment;
}

export interface CreateJamDto {
  targetType: TargetType;
  matchThreshold?: number;
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  environment?: Environment;
}
