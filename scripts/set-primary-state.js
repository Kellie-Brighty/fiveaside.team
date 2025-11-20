/**
 * Script: Set primaryState for existing users
 * 
 * This script sets the primaryState field for all existing users in Firestore.
 * Users without a primaryState will have it set to "kaduna" (or the first active state).
 * 
 * Usage:
 *   node scripts/set-primary-state.js [stateId]
 * 
 * If stateId is not provided, it defaults to "kaduna"
 * 
 * The script is idempotent - it can be run multiple times safely.
 * It only updates users who don't have a primaryState set.
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    // Try to initialize with service account file
    try {
      const serviceAccountPath = join(__dirname, '..', 'serviceAccountKey.json');
      const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('✓ Initialized Firebase Admin with service account');
    } catch (fileError) {
      // Fallback to environment variables or default credentials
      console.log('⚠️  Service account file not found, using Application Default Credentials');
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
    }
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error.message);
    throw error;
  }
}

const db = admin.firestore();

// Get stateId from command line arguments or default to "kaduna"
const stateId = process.argv[2] || 'kaduna';

async function setPrimaryStateForUsers() {
  try {
    console.log(`\n🚀 Starting primaryState migration for users...`);
    console.log(`📌 Target state: ${stateId}\n`);

    // Get all users
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.empty) {
      console.log('ℹ️  No users found in database.');
      return;
    }

    console.log(`📊 Found ${usersSnapshot.size} users\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Process each user
    const batch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500; // Firestore batch limit

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      
      // Skip admins - they don't have primaryState (they manage all states)
      if (userData.role === 'admin') {
        skippedCount++;
        continue;
      }
      
      // Only update users who don't have primaryState set
      if (!userData.primaryState) {
        try {
          batch.update(userDoc.ref, { primaryState: stateId });
          batchCount++;
          updatedCount++;

          // Commit batch if we've reached the limit
          if (batchCount >= BATCH_SIZE) {
            await batch.commit();
            console.log(`✓ Updated batch of ${batchCount} users`);
            batchCount = 0;
          }
        } catch (error) {
          console.error(`❌ Error updating user ${userDoc.id}:`, error.message);
          errorCount++;
        }
      } else {
        skippedCount++;
      }
    }

    // Commit remaining updates
    if (batchCount > 0) {
      await batch.commit();
      console.log(`✓ Updated final batch of ${batchCount} users`);
    }

    console.log(`\n✅ Migration completed!\n`);
    console.log(`📊 Results:`);
    console.log(`   - Updated: ${updatedCount} users`);
    console.log(`   - Skipped (admins or already has primaryState): ${skippedCount} users`);
    console.log(`   - Errors: ${errorCount} users\n`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
setPrimaryStateForUsers()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

