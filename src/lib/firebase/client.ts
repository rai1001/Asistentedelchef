// src/lib/firebase/client.ts
import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

let clientAppInstance: FirebaseApp | undefined = undefined;
let clientDbInstance: Firestore | undefined = undefined;

// Attempt initialization when the module is loaded.
// Errors are logged but not thrown to allow 'next build' to potentially pass.
// Runtime checks in client components should verify if clientDbInstance is available.
const clientFirebaseConfigString = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;

if (clientFirebaseConfigString) {
  try {
    const firebaseClientConfig: FirebaseOptions = JSON.parse(clientFirebaseConfigString);
    if (Object.keys(firebaseClientConfig).length > 0 && firebaseClientConfig.projectId) { // Added check for projectId
      if (!getApps().length) {
        clientAppInstance = initializeApp(firebaseClientConfig);
        console.log('[Firebase Client Config] Firebase client app initialized successfully on module load.');
      } else {
        clientAppInstance = getApp();
        console.log('[Firebase Client Config] Firebase client app already initialized (module load).');
      }
      if (clientAppInstance) {
        clientDbInstance = getFirestore(clientAppInstance);
        console.log('[Firebase Client Config] Client Firestore (db) instance obtained on module load.');
      }
    } else {
      console.error('[Firebase Client Config] CRITICAL ERROR (MODULE LOAD): NEXT_PUBLIC_FIREBASE_CONFIG is an empty object or missing projectId. Client SDK NOT initialized correctly. Client-side Firebase operations will FAIL.');
    }
  } catch (e: any) {
    console.error(
      `[Firebase Client Config] CRITICAL ERROR (MODULE LOAD): Error parsing NEXT_PUBLIC_FIREBASE_CONFIG or initializing client app. Value (start): "${clientFirebaseConfigString.substring(0,50)}...". Error: ${e.message}. Client-side Firebase operations will FAIL.`
    );
    // clientAppInstance and clientDbInstance remain undefined
  }
} else {
  console.error(
    '[Firebase Client Config] CRITICAL ERROR (MODULE LOAD): Missing environment variable NEXT_PUBLIC_FIREBASE_CONFIG. Client SDK NOT initialized. Client-side Firebase operations will FAIL.'
  );
  // clientAppInstance and clientDbInstance remain undefined
}

export const clientApp = clientAppInstance;
// This is what client components import as 'db'. It might be undefined if initialization failed.
export const db = clientDbInstance;
