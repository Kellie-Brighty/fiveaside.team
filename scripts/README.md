# Migration Scripts

## migrate-to-state-subcollections.js

This script migrates existing Firestore data from direct collections to the new state-based subcollection structure.

### Prerequisites

1. **Firebase Admin SDK Setup:**
   - Install Firebase Admin SDK: `npm install firebase-admin`
   - Set up service account credentials:
     - Option 1: Download service account key from Firebase Console
       - Go to Project Settings > Service Accounts
       - Click "Generate New Private Key"
       - Save as `serviceAccountKey.json` in project root
     - Option 2: Use Application Default Credentials (for Cloud environments)

2. **Backup your data:**
   - Always backup your Firestore database before running migrations
   - Use Firebase Console > Firestore > Export

### Usage

```bash
# Migrate to default state (kaduna)
node scripts/migrate-to-state-subcollections.js

# Migrate to specific state
node scripts/migrate-to-state-subcollections.js lagos

# With delete old collections (USE WITH CAUTION)
node scripts/migrate-to-state-subcollections.js kaduna --delete-old
```

### What it does

1. **Creates state document** if it doesn't exist in `states/{stateId}`
2. **Migrates collections** from old structure to new:
   - `clubs` → `states/{stateId}/clubs`
   - `leagues` → `states/{stateId}/leagues`
   - `playerProfiles` → `states/{stateId}/players` (note: collection name changes to match COLLECTION_NAMES.PLAYERS)
   - `products` → `states/{stateId}/products`
   - `orders` → `states/{stateId}/orders`
   - `serviceProviders` → `states/{stateId}/serviceProviders`
   - `serviceBookings` → `states/{stateId}/serviceBookings`
   - `savedSearches` → `states/{stateId}/savedSearches`
   - `playerNotes` → `states/{stateId}/playerNotes`
   - `scoutMessages` → `states/{stateId}/scoutMessages`
   - `recruitmentRecords` → `states/{stateId}/recruitmentRecords`
   - `transferRequests` → `states/{stateId}/transferRequests`

3. **Skips existing documents** (idempotent - safe to run multiple times)
4. **Provides progress feedback** and summary

### Collections NOT migrated

These collections remain global (not state-specific):
- `users` - Global user accounts
- `matches` - May be global or state-specific (check your implementation)
- `teams` - May be global or state-specific
- `pitches` - May be global or state-specific

### Safety Features

- ✅ **Idempotent**: Can be run multiple times safely
- ✅ **Non-destructive**: Doesn't delete old data by default
- ✅ **Checks for existing data**: Skips documents already in new location
- ✅ **Batch processing**: Uses Firestore batches for efficiency
- ✅ **Error handling**: Continues on individual document errors

### After Migration

1. **Verify the data:**
   - Check a few documents in the new location
   - Verify counts match between old and new locations
   - Test the application with new data structure

2. **Update Firestore indexes:**
   - Some queries may need new composite indexes
   - Check Firebase Console for index creation prompts

3. **Delete old collections (optional):**
   - Only after thorough verification
   - Consider keeping old data for a grace period
   - Use Firebase Console or Admin SDK to delete

### Troubleshooting

**Error: "Cannot find module 'firebase-admin'"**
- Run: `npm install firebase-admin`

**Error: "Permission denied"**
- Check service account has Firestore Admin permissions
- Verify service account key file is correct

**Error: "Collection not found"**
- This is normal if collection doesn't exist yet
- Script will skip empty collections

**Migration is slow:**
- Large collections take time
- Script processes in batches of 500 documents
- Progress is shown for each collection

### Example Output

```
🚀 Starting migration to state-based subcollections...
📍 Target state: kaduna
📅 Started at: 2024-01-15T10:30:00.000Z

📦 Migrating clubs -> states/kaduna/clubs...
   ✓ Migrated batch of 500 documents
   ✓ Migrated final batch of 250 documents
   ✅ clubs: 750 migrated, 0 skipped, 0 errors

📦 Migrating leagues -> states/kaduna/leagues...
   ✓ No documents found in leagues
   ✅ leagues: 0 migrated, 0 skipped, 0 errors

...

============================================================
📊 Migration Summary
============================================================
✅ Total migrated: 1250
⏭️  Total skipped: 0
❌ Total errors: 0

📅 Completed at: 2024-01-15T10:35:00.000Z
```

