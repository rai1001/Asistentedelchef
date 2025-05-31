
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Attempt to get projectId from GOOGLE_CLOUD_PROJECT (common in Cloud Run)
// then fallback to NEXT_PUBLIC_FIREBASE_PROJECT_ID.
const projectIdFromEnv = process.env.GOOGLE_CLOUD_PROJECT || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

console.log(`[Firebase Config] GOOGLE_CLOUD_PROJECT: ${process.env.GOOGLE_CLOUD_PROJECT}`);
console.log(`[Firebase Config] NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
console.log(`[Firebase Config] Resolved projectId to use: ${projectIdFromEnv}`);

if (!projectIdFromEnv) {
  const errorMessage = "Firebase projectId is missing. Critical configuration error. Ensure GOOGLE_CLOUD_PROJECT (for Cloud Run) or NEXT_PUBLIC_FIREBASE_PROJECT_ID (for client/server Next.js) environment variable is set and accessible.";
  console.error(errorMessage);
  // Throwing an error here will stop the application from starting with a bad config,
  // making the issue more visible in logs immediately.
  throw new Error(errorMessage);
}

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: projectIdFromEnv, // Use the derived projectId
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Log the configuration being used (omitting sensitive parts if necessary, though API key is often logged)
console.log(`[Firebase Config] Initializing Firebase with effective projectId: ${firebaseConfig.projectId}`);
if (!firebaseConfig.apiKey) {
  console.warn("[Firebase Config] Firebase API Key (NEXT_PUBLIC_FIREBASE_API_KEY) is missing or undefined.");
}
if (!firebaseConfig.authDomain) {
  console.warn("[Firebase Config] Firebase Auth Domain (NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) is missing or undefined.");
}


let app;
if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
    console.log("[Firebase Config] Firebase app initialized successfully.");
  } catch (e) {
    console.error("[Firebase Config] Error initializing Firebase app:", e);
    // If initialization fails, db will be undefined, leading to errors later.
    // Handle this case, e.g., by not trying to get Firestore instance or by re-throwing.
    throw e; // Re-throw to make it clear initialization failed
  }
} else {
  app = getApp();
  console.log("[Firebase Config] Firebase app already initialized (likely due to HMR or multiple imports).");
}

let db;
// Only try to get Firestore if app was successfully initialized
if (app && app.name) { // Check if app object is valid
    try {
        db = getFirestore(app);
        console.log("[Firebase Config] Firestore instance obtained successfully.");
    } catch (e) {
        console.error("[Firebase Config] Error obtaining Firestore instance:", e);
        // db will remain undefined.
        throw e; // Re-throw
    }
} else {
    const appInitErrorMessage = "[Firebase Config] Firebase app is not properly initialized, cannot get Firestore instance.";
    console.error(appInitErrorMessage);
    // This state should ideally be prevented by throwing an error during initializeApp.
    // If we reach here, it means app initialization might have silently failed or app is null/undefined.
    throw new Error(appInitErrorMessage);
}

export { app, db };
