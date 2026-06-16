/**
 * One-off, idempotent migration for the Batch 1 data-foundation changes.
 *
 * Run from the backend/ directory:
 *   node src/scripts/migrate-batch1.js
 *
 * Safe to run multiple times. It:
 *   1. Backfills Couple.relationshipStartDate from relationshipStartedAt so
 *      existing couples keep their current "days together" math.
 *   2. Flips legacy moods saved as "private" to "partner_only" so both
 *      partners see moods (the previous default hid them). Honors a future
 *      opt-out by only touching docs that are still on the old default.
 *   3. Seeds privacy defaults on users that predate the privacy sub-document.
 *
 * NOTE on (2): if you'd rather NOT retroactively reveal old private moods,
 * comment out the mood step before running.
 */

require("dotenv").config();

const mongoose = require("mongoose");

const Couple = require("../modules/couples/couple.model");
const Mood = require("../modules/moods/mood.model");
const User = require("../modules/users/user.model");

const DEFAULT_PRIVACY = {
  moodVisibility: "partner_only",
  memoryVisibility: "partner_only",
  journeyVisibility: "partner_only",
  aiVisibility: "partner_only",
  profileVisibility: "partner_only",
  activityVisibility: "partner_only",
};

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set. Aborting.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB\n");

  // 1) Couples: backfill relationshipStartDate ← relationshipStartedAt
  const coupleRes = await Couple.updateMany(
    {
      $or: [
        { relationshipStartDate: { $exists: false } },
        { relationshipStartDate: null },
      ],
    },
    [{ $set: { relationshipStartDate: "$relationshipStartedAt" } }],
  );
  console.log(
    `Couples: backfilled relationshipStartDate on ${coupleRes.modifiedCount} doc(s).`,
  );

  // 2) Moods: legacy "private" default -> "partner_only"
  const moodRes = await Mood.updateMany(
    { visibility: "private" },
    { $set: { visibility: "partner_only" } },
  );
  console.log(
    `Moods: switched ${moodRes.modifiedCount} private mood(s) to partner_only.`,
  );

  // 3) Users: seed privacy defaults where missing
  const userRes = await User.updateMany(
    {
      $or: [{ privacy: { $exists: false } }, { privacy: null }],
    },
    { $set: { privacy: DEFAULT_PRIVACY } },
  );
  console.log(
    `Users: seeded privacy defaults on ${userRes.modifiedCount} doc(s).`,
  );

  await mongoose.disconnect();
  console.log("\nMigration complete. Disconnected.");
  process.exit(0);
};

run().catch(async (err) => {
  console.error("Migration failed:", err);
  try {
    await mongoose.disconnect();
  } catch {
    /* noop */
  }
  process.exit(1);
});
