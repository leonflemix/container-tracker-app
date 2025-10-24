// File: src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, Timestamp } from 'firebase/firestore';

let firebaseConfig = {};
let app = null; // Initialize as null
let authInstance = null; // Initialize as null
let dbInstance = null; // Initialize as null
let firebaseInitialized = false; // Flag to track initialization

try {
  // 1. Prioritize environment-injected config (Canvas, Vercel Env Vars parsed into __firebase_config)
  if (typeof window !== 'undefined' && typeof window.__firebase_config !== 'undefined' && window.__firebase_config) {
    const configString = window.__firebase_config;
    // Basic check to ensure it's likely a JSON string
    if (typeof configString === 'string' && configString.trim().startsWith('{')) {
       firebaseConfig = JSON.parse(configString);
       console.log("Using environment-injected Firebase config (__firebase_config).");
       firebaseInitialized = true;
    } else {
        console.warn("__firebase_config is defined but not a valid JSON string. Value:", configString);
    }
  } 
  
  // 2. Fallback to process.env (for local development via .env files)
  // Make sure this only runs if the first method didn't succeed
  if (!firebaseInitialized && process.env.REACT_APP_FIREBASE_CONFIG) {
     try {
        firebaseConfig = JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG);
        console.log("Using Firebase config from REACT_APP_FIREBASE_CONFIG environment variable.");
        firebaseInitialized = true;
     } catch (parseError) {
         console.error("Error parsing REACT_APP_FIREBASE_CONFIG. Make sure it's valid JSON.", parseError);
     }
  }

  // Initialize Firebase only if config was successfully loaded
  if (firebaseInitialized && firebaseConfig.apiKey) { // Added apiKey check
    app = initializeApp(firebaseConfig);
    authInstance = getAuth(app);
    dbInstance = getFirestore(app);
     console.log("Firebase initialized successfully.");
  } else {
    // 3. Log an error only if no configuration was found
    console.error("Firebase configuration could not be loaded from __firebase_config or environment variables. Firebase services cannot be initialized.");
  }

} catch (error) {
  console.error("Error during Firebase initialization setup:", error);
  // Ensure instances remain null if any error occurs during setup
   app = null; 
   authInstance = null;
   dbInstance = null;
}

// Export potentially null instances. Components using these MUST handle the null case.
export const auth = authInstance;
export const db = dbInstance;
export { Timestamp };
export default app;
