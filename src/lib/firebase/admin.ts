// src/lib/firebase/admin.ts
import * as admin from 'firebase-admin';
import type { Firestore } from 'firebase-admin/firestore';

let adminAppInstance: admin.app.App | undefined = undefined;
let adminDbInstance: Firestore | undefined = undefined;

// Attempt initialization when the module is loaded.
// Errors are logged but not thrown to allow 'next build' to potentially pass.
// Runtime checks in server actions should verify if adminDbInstance is available.
if (!admin.apps.length) {
  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountString) {
    try {
      const serviceAccount = JSON.parse(serviceAccountString);
      adminAppInstance = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      adminDbInstance = admin.firestore();
      console.log('[Firebase Admin Config] Firebase Admin SDK initialized successfully on module load.');
    } catch (e: any) {
      console.error(
        `[Firebase Admin Config] CRITICAL ERROR (MODULE LOAD): Failed to initialize Firebase Admin SDK. Check FIREBASE_SERVICE_ACCOUNT JSON integrity. Error: ${e.message}. Subsequent admin operations will FAIL.`
      );
      // adminAppInstance and adminDbInstance remain undefined
    }
  } else {
    console.error(
      '[Firebase Admin Config] CRITICAL ERROR (MODULE LOAD): Missing environment variable FIREBASE_SERVICE_ACCOUNT. Admin SDK NOT initialized. Subsequent admin operations will FAIL.'
    );
    // adminAppInstance and adminDbInstance remain undefined
  }
} else {
  adminAppInstance = admin.app();
  adminDbInstance = admin.firestore();
  console.log('[Firebase Admin Config] Firebase Admin SDK already initialized (module load).');
}

export const adminApp = adminAppInstance;
export const adminDb = adminDbInstance;
