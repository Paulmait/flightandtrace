/**
 * Complete Firebase Setup Script
 * Run this to create all collections and initial data
 */

const admin = require('firebase-admin');
const { collections, createCollections } = require('./createCollections');

// Check for service account key
let serviceAccount;
try {
  serviceAccount = require('./serviceAccountKey.json');
} catch (error) {
  console.error('❌ Service account key not found!');
  console.log('\n📋 To get your service account key:');
  console.log('1. Go to Firebase Console');
  console.log('2. Project Settings → Service Accounts');
  console.log('3. Generate New Private Key');
  console.log('4. Save as: scripts/serviceAccountKey.json');
  console.log('5. Run this script again\n');
  process.exit(1);
}

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function setupFirebase() {
  console.log('🔥 Firebase Setup Starting...\n');
  console.log('Project:', serviceAccount.project_id);
  console.log('────────────────────────────\n');

  try {
    // Create all collections
    await createCollections(db);
    
    // Additional setup tasks
    console.log('\n📊 Running additional setup...');
    
    // Set server timestamp on all documents
    const batch = db.batch();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    // Update timestamps
    batch.update(db.collection('system').doc('config'), { 
      createdAt: timestamp,
      lastModified: timestamp 
    });
    
    batch.update(db.collection('analytics').doc('overview'), { 
      lastUpdated: timestamp 
    });
    
    await batch.commit();
    console.log('✅ Timestamps updated');
    
    // Create composite indexes (these will be created automatically when queries run)
    console.log('\n📑 Note: Composite indexes will be created automatically');
    console.log('   when you run queries that need them.');
    console.log('   Firebase will provide links in the console to create them.\n');
    
    // Summary
    console.log('════════════════════════════');
    console.log('✨ Firebase Setup Complete!');
    console.log('════════════════════════════\n');
    
    console.log('📦 Collections Created:');
    Object.keys(collections).forEach(name => {
      console.log(`  ✓ ${name}`);
    });
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Deploy security rules: firebase deploy --only firestore:rules');
    console.log('2. Deploy indexes: firebase deploy --only firestore:indexes');
    console.log('3. Test your app connection');
    console.log('4. Check Firebase Console for data\n');
    
    console.log('🔗 Firebase Console:');
    console.log(`   https://console.firebase.google.com/project/${serviceAccount.project_id}/firestore\n`);
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run setup
setupFirebase().then(() => {
  console.log('👍 All done! Your database is ready for production.\n');
  process.exit(0);
}).catch(error => {
  console.error('Setup error:', error);
  process.exit(1);
});