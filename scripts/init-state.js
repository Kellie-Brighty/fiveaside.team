/**
 * Script: Initialize a new state in Firestore
 * 
 * This script creates a state document in Firestore for a new state.
 * It creates the state document at states/{stateId} with metadata.
 * 
 * Usage:
 *   node scripts/init-state.js [stateId]
 * 
 * Example:
 *   node scripts/init-state.js ondo
 * 
 * The script is idempotent - it can be run multiple times safely.
 * It checks if the state document already exists before creating.
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

// Get stateId from command line arguments
const stateId = process.argv[2];

if (!stateId) {
  console.error('❌ Error: State ID is required');
  console.log('\nUsage: node scripts/init-state.js [stateId]');
  console.log('Example: node scripts/init-state.js ondo\n');
  process.exit(1);
}

async function initState() {
  try {
    console.log(`\n🚀 Initializing state: ${stateId}\n`);

    // Check if state document already exists
    const stateDocRef = db.collection('states').doc(stateId);
    const stateDoc = await stateDocRef.get();

    if (stateDoc.exists) {
      console.log(`ℹ️  State document for ${stateId} already exists.`);
      const data = stateDoc.data();
      console.log(`   Created: ${data?.createdAt?.toDate?.() || 'Unknown'}`);
      console.log(`   Name: ${data?.name || stateId}\n`);
      return;
    }

    // Create state document
    const stateName = stateId.charAt(0).toUpperCase() + stateId.slice(1) + ' State';
    await stateDocRef.set({
      id: stateId,
      name: stateName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      initializedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ State document created successfully!`);
    console.log(`   Path: states/${stateId}`);
    console.log(`   Name: ${stateName}\n`);
    console.log(`📝 Note: State subcollections will be created automatically when data is added.`);
    console.log(`   Example: states/${stateId}/clubs, states/${stateId}/players, etc.\n`);

  } catch (error) {
    console.error('❌ Initialization failed:', error);
    process.exit(1);
  }
}

// Run the initialization
initState()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

