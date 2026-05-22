// backend/scripts/seedGallery.js
//
// Run:  node scripts/seedGallery.js
//
// Seeds the gallery collection with the images that were previously
// hard-coded in GalleryPage.jsx, so the admin can manage them from day one.

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const GalleryImage = require('../models/Gallery');

const SEED_IMAGES = [
  // ── ROOMS ────────────────────────────────────────────────────────
  { category: 'rooms', caption: 'Deluxe Room with King Bed',          order: 1,  url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&h=600&fit=crop' },
  { category: 'rooms', caption: 'Room with City View',                order: 2,  url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2' },
  { category: 'rooms', caption: 'Suite with Bedroom and Living Area',  order: 3,  url: 'https://www.homestratosphere.com/wp-content/uploads/2019/02/master-bedroom-sitting-area-design-hz-7-feb072019-min.jpg' },
  { category: 'rooms', caption: 'Spacious Room with Balcony',          order: 4,  url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop' },
  { category: 'rooms', caption: 'Executive Suite with Skyline View',   order: 5,  url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb' },
  { category: 'rooms', caption: 'Premium Room with Panoramic City View',order: 6, url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267' },
  { category: 'rooms', caption: 'Luxury Bedroom with Night City Lights',order: 7, url: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511' },
  { category: 'rooms', caption: 'Deluxe Suite with Balcony City View',  order: 8, url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b' },
  { category: 'rooms', caption: 'Modern Luxury Room with Urban View',   order: 9, url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427' },
  { category: 'rooms', caption: 'High-Rise Suite with Stunning Skyline',order:10, url: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461' },
  { category: 'rooms', caption: 'Elegant Room with Cityscape View',     order:11, url: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa' },
  { category: 'rooms', caption: 'Luxury Suite with City Panorama',      order:12, url: 'https://images.unsplash.com/photo-1578898887932-dce23a595ad4' },

  // ── POOL ─────────────────────────────────────────────────────────
  { category: 'pool', caption: 'Luxury Hotel Swimming Pool',     order: 1, url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e' },
  { category: 'pool', caption: 'Infinity Pool with Scenic View', order: 2, url: 'https://images.unsplash.com/photo-1560448204-603b3fc33ddc' },
  { category: 'pool', caption: 'Modern Outdoor Pool Area',        order: 3, url: 'https://images.unsplash.com/photo-1530549387789-4c1017266635' },
  { category: 'pool', caption: 'Resort Pool with Lounge Chairs',  order: 4, url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773' },
  { category: 'pool', caption: 'Luxury Poolside Relaxation Area', order: 5, url: 'https://images.unsplash.com/photo-1521783593447-5702b9bfd267' },
  { category: 'pool', caption: 'Private Hotel Pool Experience',   order: 6, url: 'https://images.unsplash.com/photo-1508609349937-5ec4ae374ebf' },
  { category: 'pool', caption: 'Tropical Resort Swimming Pool',   order: 7, url: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6' },

  // ── RESTAURANT ───────────────────────────────────────────────────
  { category: 'restaurant', caption: 'Luxury Hotel Restaurant Interior', order: 1, url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5' },
  { category: 'restaurant', caption: 'Fine Dining Restaurant Setup',     order: 2, url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4' },
  { category: 'restaurant', caption: 'Modern Restaurant Ambience',       order: 3, url: 'https://images.unsplash.com/photo-1552566626-52f8b828add9' },
  { category: 'restaurant', caption: 'Elegant Dining Area',              order: 4, url: 'https://images.unsplash.com/photo-1544148103-0773bf10d330' },
  { category: 'restaurant', caption: 'Outdoor Dining Experience',        order: 5, url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0' },
  { category: 'restaurant', caption: 'Romantic Dinner Setup',            order: 6, url: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17' },

  // ── SPA ──────────────────────────────────────────────────────────
  { category: 'spa', caption: 'Luxury Spa Treatment Room',      order: 1, url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874' },
  { category: 'spa', caption: 'Relaxing Massage Therapy',       order: 2, url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03' },
  { category: 'spa', caption: 'Hot Stone Massage Setup',        order: 3, url: 'https://images.unsplash.com/photo-1552693673-1bf958298935' },
  { category: 'spa', caption: 'Luxury Spa Relaxation Area',     order: 4, url: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6' },
  { category: 'spa', caption: 'Facial Treatment Spa Room',      order: 5, url: 'https://images.unsplash.com/photo-1600334129128-685c5582fd35' },
  { category: 'spa', caption: 'Aromatherapy Spa Experience',    order: 6, url: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1' },

  // ── FOOD ─────────────────────────────────────────────────────────
  { category: 'food', caption: 'Gourmet Healthy Dish',       order: 1, url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c' },
  { category: 'food', caption: 'Classic Burger Meal',         order: 2, url: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d' },
  { category: 'food', caption: 'Pasta with Rich Sauce',       order: 3, url: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601' },
  { category: 'food', caption: 'Luxury Dining Platter',       order: 4, url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836' },
  { category: 'food', caption: 'Artisanal Food Plate',        order: 5, url: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352' },
  { category: 'food', caption: 'Delicious Pizza',             order: 6, url: 'https://images.unsplash.com/photo-1499028344343-cd173ffc68a9' },
  { category: 'food', caption: 'Seafood Special Dish',        order: 7, url: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40' },
  { category: 'food', caption: 'Asian Cuisine Bowl',          order: 8, url: 'https://images.unsplash.com/photo-1529042410759-befb1204b468' },

  // ── EXCLUSIVE ────────────────────────────────────────────────────
  { category: 'exclusive', caption: 'Luxury Private Villa',          order: 1, url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2' },
  { category: 'exclusive', caption: 'Infinity Pool View',             order: 2, url: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511' },
  { category: 'exclusive', caption: 'Luxury Hotel Suite',             order: 3, url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b' },
  { category: 'exclusive', caption: 'Ocean View Balcony',             order: 4, url: 'https://images.unsplash.com/photo-1578898887932-dce23a595ad4' },
  { category: 'exclusive', caption: 'Luxury Bedroom Interior',        order: 5, url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427' },
  { category: 'exclusive', caption: 'Private Pool Villa',             order: 6, url: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a' },
  { category: 'exclusive', caption: 'Elegant Hotel Lobby',            order: 7, url: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa' },
  { category: 'exclusive', caption: 'Luxury Hotel Room Setup',        order: 8, url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945' },

  // ── SERVICES ─────────────────────────────────────────────────────
  { category: 'services', caption: 'Luxury Concierge Service',   order: 1, url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4' },
  { category: 'services', caption: 'Hotel Reception Service',    order: 2, url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d' },
  { category: 'services', caption: 'Fine Dining Experience',     order: 3, url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4' },
  { category: 'services', caption: 'Luxury Chauffeur Service',   order: 4, url: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1' },
  { category: 'services', caption: 'Airport Transfer Service',   order: 5, url: 'https://images.unsplash.com/photo-1494526585095-c41746248156' },
  { category: 'services', caption: 'Luxury Car Service',         order: 6, url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70' },
  { category: 'services', caption: 'Guided Tour Experience',     order: 7, url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee' },
  { category: 'services', caption: 'Beach Leisure Experience',   order: 8, url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e' },
  { category: 'services', caption: 'Spa Wellness Service',       order: 9, url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773' },
  { category: 'services', caption: 'Luxury Lounge Experience',  order:10, url: 'https://images.unsplash.com/photo-1492724441997-5dc865305da7' },
];

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel_management';
  console.log(`\n🌱 Connecting to MongoDB: ${uri}\n`);

  await mongoose.connect(uri);

  const existing = await GalleryImage.countDocuments();
  if (existing > 0) {
    const ans = process.argv.includes('--force');
    if (!ans) {
      console.log(`⚠  Gallery already has ${existing} image(s). Run with --force to re-seed.\n`);
      await mongoose.disconnect();
      return;
    }
    console.log('🗑  --force: clearing existing gallery images…');
    await GalleryImage.deleteMany({});
  }

  const docs = SEED_IMAGES.map(item => ({ ...item, active: true }));
  const inserted = await GalleryImage.insertMany(docs);

  console.log(`✅ Seeded ${inserted.length} gallery images across ${new Set(docs.map(d => d.category)).size} categories.\n`);

  // Print summary per category
  const summary = {};
  inserted.forEach(img => {
    summary[img.category] = (summary[img.category] || 0) + 1;
  });
  Object.entries(summary).forEach(([cat, count]) => {
    console.log(`   ${cat.padEnd(14)} → ${count} images`);
  });

  console.log('\n🎉 Done!\n');
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  mongoose.disconnect();
  process.exit(1);
});