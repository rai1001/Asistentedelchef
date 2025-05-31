
import { initializeApp as initializeClientApp, getApps as getClientApps, getApp as getClientApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore as getClientFirestore } from 'firebase/firestore';
import * as admin from 'firebase-admin';

// --- Client SDK Initialization ---
const projectIdFromEnvForClient = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;

console.log(`[Firebase Client Config] NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
console.log(`[Firebase Client Config] GOOGLE_CLOUD_PROJECT (for client fallback): ${process.env.GOOGLE_CLOUD_PROJECT}`);
console.log(`[Firebase Client Config] Resolved projectId for Client SDK: ${projectIdFromEnvForClient}`);

if (!projectIdFromEnvForClient) {
  const errorMessage = "[Firebase Client Config] CRITICAL: Firebase projectId is missing for client SDK. Ensure NEXT_PUBLIC_FIREBASE_PROJECT_ID (preferred for client) or GOOGLE_CLOUD_PROJECT environment variable is set.";
  console.error(errorMessage);
  throw new Error(errorMessage);
}

const firebaseClientConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: projectIdFromEnvForClient,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseClientConfig.apiKey) {
  console.warn("[Firebase Client Config] Firebase API Key (NEXT_PUBLIC_FIREBASE_API_KEY) is missing or undefined. This might affect client-side Firebase services like Auth, but Firestore client (db) might still work if projectId is correct.");
}

let clientApp;
if (!getClientApps().length) {
  try {
    clientApp = initializeClientApp(firebaseClientConfig);
    console.log("[Firebase Client Config] Firebase client app initialized successfully.");
  } catch (e) {
    console.error("[Firebase Client Config] Error initializing Firebase client app:", e);
    throw e; 
  }
} else {
  clientApp = getClientApp();
  console.log("[Firebase Client Config] Firebase client app already initialized.");
}

let db; // Client Firestore instance
try {
    db = getClientFirestore(clientApp);
    console.log("[Firebase Client Config] Client Firestore instance (db) obtained successfully.");
} catch (e) {
    console.error("[Firebase Client Config] CRITICAL: Error obtaining client Firestore instance (db):", e);
    throw e; 
}

// --- Admin SDK Initialization ---
let adminApp: admin.app.App;
let adminDb: admin.firestore.Firestore;

if (!admin.apps.length) {
  try {
    // For Cloud Run: Uses Application Default Credentials (ADC) from the service's environment.
    // For Local Development: Uses GOOGLE_APPLICATION_CREDENTIALS environment variable.
    adminApp = admin.initializeApp();
    console.log("[Firebase Admin Config] Firebase Admin SDK initialized successfully (using ADC on Cloud Run or GOOGLE_APPLICATION_CREDENTIALS locally).");
  } catch (e) {
    console.error("[Firebase Admin Config] CRITICAL: Firebase Admin SDK failed to initialize.", e);
    console.error("[Firebase Admin Config] For local development, ensure GOOGLE_APPLICATION_CREDENTIALS environment variable is set to the path of your service account key JSON file.");
    console.error("[Firebase Admin Config] For Cloud Run, ensure the associated service account (usually [PROJECT_ID]@appspot.gserviceaccount.com or a Firebase-managed one) has necessary IAM permissions (e.g., 'Cloud Datastore User', 'Firebase Admin SDK Administrator Service Agent', or 'Editor').");
    throw e; // Re-throw to prevent app from running with a misconfigured admin SDK
  }
} else {
  adminApp = admin.app();
  console.log("[Firebase Admin Config] Firebase Admin SDK already initialized.");
}

try {
  adminDb = adminApp.firestore();
  console.log("[Firebase Admin Config] Admin Firestore instance (adminDb) obtained successfully.");
} catch (e) {
  console.error("[Firebase Admin Config] CRITICAL: Error obtaining admin Firestore instance (adminDb):", e);
  throw e;
}

export { clientApp as app, db, adminApp, adminDb };
