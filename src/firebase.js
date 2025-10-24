// File: src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, Timestamp } from 'firebase/firestore';

let firebaseConfig = {};
let app;
let authInstance;
let dbInstance;

try {
  // ONLY rely on the config injected by the environment (Canvas, Vercel, etc.)
  if (typeof window !== 'undefined' && typeof window.__firebase_config !== 'undefined' && window.__firebase_config) {
    firebaseConfig = JSON.parse(window.__firebase_config);
    app = initializeApp(firebaseConfig);
    authInstance = getAuth(app);
    dbInstance = getFirestore(app);
  } else {
    // Log an error if the config is missing in a production-like environment
    console.error("Firebase configuration object (__firebase_config) is missing. Firebase services cannot be initialized.");
    // Provide non-functional placeholders to prevent immediate crashes elsewhere
    app = null; 
    authInstance = null;
    dbInstance = null;
  }
} catch (error) {
  console.error("Error initializing Firebase:", error);
   app = null;
   authInstance = null;
   dbInstance = null;
}

// Export potentially null instances. Components using these should handle the null case.
export const auth = authInstance;
export const db = dbInstance;
export { Timestamp };
export default app;

