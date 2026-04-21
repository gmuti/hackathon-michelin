import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // -- Restaurants --
  const restaurantsData = [
    {
      name: 'Le Grand Véfour',
      description: 'Restaurant gastronomique parisien fondé en 1784, étoilé Michelin.',
      address: '17 Rue de Beaujolais, 75001 Paris',
      city: 'Paris',
      lat: 48.8638,
      lng: 2.3374,
      michelinStars: 2,
      cuisineType: 'Française',
      priceRange: 4,
      dietaryOptions: ['végétarien'],
      qrCode: 'QR-GRAND-VEFOUR-001',
    },
    {
      name: "L'Arpège",
      description: 'Cuisine végétale haute gastronomie par Alain Passard.',
      address: '84 Rue de Varenne, 75007 Paris',
      city: 'Paris',
      lat: 48.8559,
      lng: 2.3157,
      michelinStars: 3,
      cuisineType: 'Végétale',
      priceRange: 4,
      dietaryOptions: ['végétarien', 'vegan'],
      qrCode: 'QR-ARPEGE-002',
    },
    {
      name: 'Septime',
      description: 'Bistrot contemporain avec une cuisine de saison inventive.',
      address: '80 Rue de Charonne, 75011 Paris',
      city: 'Paris',
      lat: 48.8537,
      lng: 2.3793,
      michelinStars: 1,
      cuisineType: 'Bistrot moderne',
      priceRange: 3,
      dietaryOptions: ['végétarien', 'sans gluten'],
      qrCode: 'QR-SEPTIME-003',
    },
    {
      name: 'Le Cinq',
      description: 'Restaurant du George V, palace parisien légendaire.',
      address: '31 Av. George V, 75008 Paris',
      city: 'Paris',
      lat: 48.8691,
      lng: 2.3018,
      michelinStars: 3,
      cuisineType: 'Française classique',
      priceRange: 4,
      dietaryOptions: [],
      qrCode: 'QR-LECINQ-004',
    },
    {
      name: 'Frenchie',
      description: 'Cuisine franco-britannique dans une ruelle du Sentier.',
      address: '5 Rue du Nil, 75002 Paris',
      city: 'Paris',
      lat: 48.8636,
      lng: 2.3480,
      michelinStars: 1,
      cuisineType: 'Franco-britannique',
      priceRange: 3,
      dietaryOptions: ['végétarien'],
      qrCode: 'QR-FRENCHIE-005',
    },
  ];

  const photoSets = [
    [
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800',
    ],
    [
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
      'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=800',
    ],
    [
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=800',
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800',
    ],
    [
      'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=800',
      'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800',
    ],
    [
      'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
    ],
  ];

  const dishSets = [
    [
      { name: 'Foie gras poêlé', price: 48, category: 'Entrée', emoji: '🦆' },
      { name: 'Sole meunière', price: 68, category: 'Plat', emoji: '🐟' },
      { name: 'Soufflé au Grand Marnier', price: 28, category: 'Dessert', emoji: '🍮' },
    ],
    [
      { name: 'Légumes de saison rôtis', price: 35, category: 'Entrée', emoji: '🥕' },
      { name: 'Artichaut en barigoule', price: 55, category: 'Plat', emoji: '🌿' },
      { name: 'Tarte aux fruits rouges', price: 22, category: 'Dessert', emoji: '🍓' },
    ],
    [
      { name: 'Œuf parfait truffe', price: 22, category: 'Entrée', emoji: '🥚' },
      { name: 'Canard laqué', price: 38, category: 'Plat', emoji: '🦆' },
      { name: 'Paris-Brest revisité', price: 18, category: 'Dessert', emoji: '🍰' },
    ],
    [
      { name: 'Caviar osciètre', price: 95, category: 'Entrée', emoji: '🫧' },
      { name: 'Homard breton', price: 125, category: 'Plat', emoji: '🦞' },
      { name: 'Mille-feuille vanille', price: 32, category: 'Dessert', emoji: '🍮' },
    ],
    [
      { name: 'Burrata stracciatella', price: 18, category: 'Entrée', emoji: '🧀' },
      { name: 'Agneau de lait rôti', price: 42, category: 'Plat', emoji: '🍖' },
      { name: 'Crème brûlée yuzu', price: 16, category: 'Dessert', emoji: '🍋' },
    ],
  ];

  for (let i = 0; i < restaurantsData.length; i++) {
    const restaurant = await prisma.restaurant.upsert({
      where: { qrCode: restaurantsData[i].qrCode },
      update: {},
      create: restaurantsData[i],
    });

    for (let j = 0; j < photoSets[i].length; j++) {
      await prisma.restaurantPhoto.upsert({
        where: { id: `seed-photo-r${i}-${j}` },
        update: {},
        create: { id: `seed-photo-r${i}-${j}`, restaurantId: restaurant.id, url: photoSets[i][j], position: j },
      });
    }

    for (const dish of dishSets[i]) {
      await prisma.dish.create({ data: { restaurantId: restaurant.id, ...dish } });
    }
  }

  // -- Hotels --
  const hotelsData = [
    {
      name: 'Hôtel Plaza Athénée',
      description: 'Palace parisien sur l\'avenue Montaigne.',
      city: 'Paris',
      country: 'France',
      lat: 48.8674,
      lng: 2.3021,
      environment: 'CITY' as const,
      stars: 5,
      pricePerNight: 1200,
      amenities: ['spa', 'piscine', 'restaurant gastronomique', 'conciergerie'],
    },
    {
      name: 'Le Domaine des Étangs',
      description: 'Château médiéval au cœur de la Charente.',
      city: 'Massignac',
      country: 'France',
      lat: 45.7167,
      lng: 0.5833,
      environment: 'COUNTRY' as const,
      stars: 5,
      pricePerNight: 650,
      amenities: ['spa', 'lac privé', 'vélos', 'golf'],
    },
    {
      name: 'Maison Estournel',
      description: 'Boutique-hôtel dans les vignes du Saint-Estèphe.',
      city: 'Saint-Estèphe',
      country: 'France',
      lat: 45.2648,
      lng: -0.7629,
      environment: 'SUBURB' as const,
      stars: 4,
      pricePerNight: 380,
      amenities: ['dégustation de vins', 'piscine', 'restaurant'],
    },
  ];

  for (let i = 0; i < hotelsData.length; i++) {
    const hotel = await prisma.hotel.create({ data: hotelsData[i] });

    // Disponibilités sur 30 jours
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let d = 0; d < 30; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() + d);
      await prisma.hotelAvailability.create({
        data: { hotelId: hotel.id, date, available: Math.random() > 0.1 },
      });
    }
  }

  // -- Test users --
  await prisma.user.upsert({
    where: { email: 'alice@test.michelin' },
    update: {},
    create: {
      supabaseId: 'test-supabase-id-alice',
      email: 'alice@test.michelin',
      username: 'alice_gourmet',
      bio: 'Passionnée de gastronomie française',
      cuisinePreferences: ['Française', 'Italienne'],
      dietaryRestrictions: [],
    },
  });

  await prisma.user.upsert({
    where: { email: 'bob@test.michelin' },
    update: {},
    create: {
      supabaseId: 'test-supabase-id-bob',
      email: 'bob@test.michelin',
      username: 'bob_foodie',
      bio: 'Amateur de cuisine du monde',
      cuisinePreferences: ['Japonaise', 'Péruvienne'],
      dietaryRestrictions: ['sans gluten'],
    },
  });

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
