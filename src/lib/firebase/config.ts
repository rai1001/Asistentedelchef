
import { initializeApp as initializeClientApp, getApps as getClientApps, getApp as getClientApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore as getClientFirestore } from 'firebase/firestore';
import * as admin from 'firebase-admin';

// Client SDK Initialization
const projectIdFromEnv = process.env.GOOGLE_CLOUD_PROJECT || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

console.log(`[Firebase Client Config] GOOGLE_CLOUD_PROJECT: ${process.env.GOOGLE_CLOUD_PROJECT}`);
console.log(`[Firebase Client Config] NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
console.log(`[Firebase Client Config] Resolved projectId to use for client SDK: ${projectIdFromEnv}`);

if (!projectIdFromEnv) {
  const errorMessage = "Firebase projectId is missing for client SDK. Critical configuration error. Ensure GOOGLE_CLOUD_PROJECT (for Cloud Run) or NEXT_PUBLIC_FIREBASE_PROJECT_ID (for client/server Next.js) environment variable is set and accessible.";
  console.error(errorMessage);
  throw new Error(errorMessage);
}

const firebaseClientConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: projectIdFromEnv,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log(`[Firebase Client Config] Initializing Firebase client SDK with effective projectId: ${firebaseClientConfig.projectId}`);
if (!firebaseClientConfig.apiKey) {
  console.warn("[Firebase Client Config] Firebase API Key (NEXT_PUBLIC_FIREBASE_API_KEY) is missing or undefined.");
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
if (clientApp && clientApp.name) { 
    try {
        db = getClientFirestore(clientApp);
        console.log("[Firebase Client Config] Client Firestore instance obtained successfully.");
    } catch (e) {
        console.error("[Firebase Client Config] Error obtaining client Firestore instance:", e);
        throw e; 
    }
} else {
    const clientAppInitErrorMessage = "[Firebase Client Config] Firebase client app is not properly initialized, cannot get client Firestore instance.";
    console.error(clientAppInitErrorMessage);
    throw new Error(clientAppInitErrorMessage);
}

// Admin SDK Initialization
let adminApp: admin.app.App;
if (!admin.apps.length) {
  try {
    // When running in Cloud Run or other GCP environments, initializeApp() without arguments
    // will use Application Default Credentials and infer projectId.
    // For local development, ensure GOOGLE_APPLICATION_CREDENTIALS env var is set.
    adminApp = admin.initializeApp();
    console.log("[Firebase Admin Config] Firebase Admin SDK initialized successfully.");
  } catch (e) {
    console.error("[Firebase Admin Config] Error initializing Firebase Admin SDK:", e);
    // Try initializing with explicit project ID as a fallback, though ADC should handle it.
    try {
        console.warn("[Firebase Admin Config] Retrying Admin SDK initialization with explicit projectId from GOOGLE_CLOUD_PROJECT.");
        adminApp = admin.initializeApp({
            projectId: process.env.GOOGLE_CLOUD_PROJECT, // This should be available in Cloud Run
        });
        console.log("[Firebase Admin Config] Firebase Admin SDK initialized successfully with explicit projectId.");
    } catch (e2) {
        console.error("[Firebase Admin Config] Error initializing Firebase Admin SDK even with explicit projectId:", e2);
        throw e2;
    }
  }
} else {
  adminApp = admin.app();
  console.log("[Firebase Admin Config] Firebase Admin SDK already initialized.");
}

const adminDb = adminApp.firestore();
console.log("[Firebase Admin Config] Admin Firestore instance obtained successfully.");

export { clientApp as app, db, adminApp, adminDb };
