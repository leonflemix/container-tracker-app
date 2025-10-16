import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// --- Firebase Configuration ---
// This setup uses standard React environment variables.
// The Vercel/deployment environment will provide this variable.
// For local testing, you can create a `.env.local` file in your project's root.
let firebaseConfig;

try {
  if (process.env.REACT_APP_FIREBASE_CONFIG) {
    firebaseConfig = JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG);
  } else {
    // Fallback for local development if .env.local is not set
    console.warn("Firebase config not found in environment variables. Using placeholder.");
    firebaseConfig = {
  apiKey: "AIzaSyDjM93MuLCX-S8KeZLL_cRe834bmfEWlY8",
  authDomain: "container-tracker-app-4a7d5.firebaseapp.com",
  projectId: "container-tracker-app-4a7d5",
  storageBucket: "container-tracker-app-4a7d5.firebasestorage.app",
  messagingSenderId: "840635230641",
  appId: "1:840635230641:web:986f7472c844357b14b590",
  measurementId: "G-4HLVJGLZEP"
};
  }
} catch (error) {
  console.error("Error parsing Firebase config:", error);
  // Use placeholder config on error to prevent app crash
  firebaseConfig = { apiKey: "INVALID_CONFIG" };
}


// --- Initialize Firebase and export the services ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };

