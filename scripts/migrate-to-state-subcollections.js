/**
 * Migration Script: Move Firestore data to state-based subcollections
 * 
 * This script migrates existing data from direct collections to the new
 * subcollection structure: states/{stateId}/{collectionName}/{docId}
 * 
 * Usage:
 *   node scripts/migrate-to-state-subcollections.js [stateId]
 * 
 * If stateId is not provided, it defaults to "kaduna"
 * 
 * The script is idempotent - it can be run multiple times safely.
 * It checks if data already exists in the new location before migrating.
 */

import admin from 'firebase-admin';
import readline from 'readline';
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

// Collections to migrate (mapping: oldCollectionName -> newCollectionName)
// Note: The new collection name matches COLLECTION_NAMES in stateService.ts
// If your old collection names differ, update the keys (left side) accordingly
const COLLECTIONS_TO_MIGRATE = {
  'clubs': 'clubs',                    // states/{stateId}/clubs
  'leagues': 'leagues',                // states/{stateId}/leagues
  'playerProfiles': 'players',         // Old: playerProfiles -> New: states/{stateId}/players (COLLECTION_NAMES.PLAYERS)
  'products': 'products',              // states/{stateId}/products
  'orders': 'orders',                  // states/{stateId}/orders
  'serviceProviders': 'serviceProviders', // states/{stateId}/serviceProviders
  'serviceBookings': 'serviceBookings',   // states/{stateId}/serviceBookings
  'savedSearches': 'savedSearches',    // states/{stateId}/savedSearches
  'playerNotes': 'playerNotes',        // states/{stateId}/playerNotes
  'scoutMessages': 'scoutMessages',    // states/{stateId}/scoutMessages
  'recruitmentRecords': 'recruitmentRecords', // states/{stateId}/recruitmentRecords
  'transferRequests': 'transferRequests', // states/{stateId}/transferRequests
};

// Collections that should NOT be migrated (global collections)
const GLOBAL_COLLECTIONS = [
  'users', // Users are global, not state-specific
  'matches', // May be global or state-specific (check your implementation)
  'teams', // May be global or state-specific
  'pitches', // May be global or state-specific
];

/**
 * Migrate a single collection
 */
async function migrateCollection(oldCollectionName, newCollectionName, stateId) {
  console.log(`\n📦 Migrating ${oldCollectionName} -> states/${stateId}/${newCollectionName}...`);
  
  try {
    const oldCollectionRef = db.collection(oldCollectionName);
    const snapshot = await oldCollectionRef.get();
    
    if (snapshot.empty) {
      console.log(`   ✓ No documents found in ${oldCollectionName}`);
      return { migrated: 0, skipped: 0, errors: 0 };
    }
    
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    
    const batch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500; // Firestore batch limit
    
    for (const docSnapshot of snapshot.docs) {
      try {
        const docId = docSnapshot.id;
        const data = docSnapshot.data();
        
        // Check if document already exists in new location
        const newDocRef = db.collection('states').doc(stateId).collection(newCollectionName).doc(docId);
        const newDocSnapshot = await newDocRef.get();
        
        if (newDocSnapshot.exists) {
          console.log(`   ⏭️  Skipping ${docId} (already exists in new location)`);
          skipped++;
          continue;
        }
        
        // Add to batch
        batch.set(newDocRef, data);
        batchCount++;
        
        // Execute batch if it reaches the limit
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          console.log(`   ✓ Migrated batch of ${batchCount} documents`);
          migrated += batchCount;
          batchCount = 0;
        }
      } catch (error) {
        console.error(`   ❌ Error migrating document ${docSnapshot.id}:`, error.message);
        errors++;
      }
    }
    
    // Commit remaining documents
    if (batchCount > 0) {
      await batch.commit();
      console.log(`   ✓ Migrated final batch of ${batchCount} documents`);
      migrated += batchCount;
    }
    
    console.log(`   ✅ ${oldCollectionName}: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
    return { migrated, skipped, errors };
    
  } catch (error) {
    console.error(`   ❌ Error migrating collection ${oldCollectionName}:`, error.message);
    return { migrated: 0, skipped: 0, errors: 1 };
  }
}

/**
 * Main migration function
 */
async function migrate(stateId = 'kaduna') {
  console.log(`\n🚀 Starting migration to state-based subcollections...`);
  console.log(`📍 Target state: ${stateId}`);
  console.log(`📅 Started at: ${new Date().toISOString()}\n`);
  
  // Verify state document exists (create if it doesn't)
  const stateDocRef = db.collection('states').doc(stateId);
  const stateDoc = await stateDocRef.get();
  
  if (!stateDoc.exists) {
    console.log(`📝 Creating state document for ${stateId}...`);
    await stateDocRef.set({
      id: stateId,
      name: stateId.charAt(0).toUpperCase() + stateId.slice(1) + ' State',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      migratedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`   ✓ State document created\n`);
  }
  
  // Migrate each collection
  const results = {
    totalMigrated: 0,
    totalSkipped: 0,
    totalErrors: 0,
    collections: {}
  };
  
  for (const [oldName, newName] of Object.entries(COLLECTIONS_TO_MIGRATE)) {
    const result = await migrateCollection(oldName, newName, stateId);
    results.totalMigrated += result.migrated;
    results.totalSkipped += result.skipped;
    results.totalErrors += result.errors;
    results.collections[oldName] = result;
  }
  
  // Print summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Migration Summary`);
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Total migrated: ${results.totalMigrated}`);
  console.log(`⏭️  Total skipped: ${results.totalSkipped}`);
  console.log(`❌ Total errors: ${results.totalErrors}`);
  console.log(`\n📅 Completed at: ${new Date().toISOString()}\n`);
  
  // Ask if user wants to delete old collections
  if (results.totalMigrated > 0) {
    console.log(`\n⚠️  IMPORTANT: Old collections still exist.`);
    console.log(`   Review the migrated data before deleting old collections.`);
    console.log(`   To delete old collections, run with --delete-old flag (not implemented for safety).\n`);
  }
  
  return results;
}

/**
 * Prompt user for confirmation
 */
function promptConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const stateId = args[0] || 'kaduna';
  const deleteOld = args.includes('--delete-old');
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔄 Firestore State-Based Subcollection Migration`);
  console.log(`${'='.repeat(60)}`);
  console.log(`\nThis script will migrate data from direct collections to:`);
  console.log(`  states/${stateId}/{collectionName}/{docId}\n`);
  
  if (deleteOld) {
    console.log(`⚠️  WARNING: --delete-old flag detected.`);
    console.log(`   This will DELETE old collections after migration.\n`);
    const confirmed = await promptConfirmation('Are you sure you want to proceed? (yes/no): ');
    if (!confirmed) {
      console.log('Migration cancelled.');
      process.exit(0);
    }
  }
  
  try {
    await migrate(stateId);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1] && import.meta.url.endsWith(process.argv[1]);

if (isMainModule) {
  main().catch(error => {
    console.error('\n❌ Unhandled error:', error);
    process.exit(1);
  });
}

export { migrate, migrateCollection };

