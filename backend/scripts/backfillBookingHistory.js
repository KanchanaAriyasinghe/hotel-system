// backend/scripts/backfillBookingHistory.js
//
// Run ONCE to populate bookingHistory for all existing guest accounts
// based on matching reservation emails.
//
// Usage:
//   node backend/scripts/backfillBookingHistory.js
//
// Make sure your .env (MONGODB_URI) is accessible from the project root,
// or set MONGODB_URI in the environment before running.

require('dotenv').config({ path: __dirname + '/../.env' });

const mongoose = require('mongoose');
const Guest = require('../models/Guest');
const Reservation = require('../models/Reservation');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌  MONGODB_URI not found in environment. Set it and retry.');
  process.exit(1);
}

(async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅  Connected to MongoDB');

    const reservations = await Reservation.find({}, '_id email').lean();
    console.log(`📋  Found ${reservations.length} reservation(s) to process`);

    const byEmail = {};
    reservations.forEach(r => {
      const key = r.email.toLowerCase().trim();
      if (!byEmail[key]) byEmail[key] = [];
      byEmail[key].push(r._id);
    });

    let updated = 0;
    let skipped = 0;

    for (const [email, ids] of Object.entries(byEmail)) {
      const result = await Guest.findOneAndUpdate(
        { email },
        { $addToSet: { bookingHistory: { $each: ids } } },
        { new: true }
      );

      if (result) {
        console.log(`✔ ${email} → ${result.bookingHistory.length} entries`);
        updated++;
      } else {
        skipped++;
      }
    }

    console.log(`🎉 Done. Updated ${updated}, Skipped ${skipped}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
})();