// File: src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, Timestamp } from 'firebase/firestore';

let firebaseConfig;
try {
  if (typeof window !== 'undefined' && typeof window.__firebase_config !== 'undefined' && window.__firebase_config) {
    firebaseConfig = JSON.parse(window.__firebase_config);
  } else if (process.env.REACT_APP_FIREBASE_CONFIG) {
    firebaseConfig = JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG);
  } else {
    console.warn("Firebase config not found. Using placeholder values.");
    firebaseConfig = {
      apiKey: "AIzaSyDjM93MuLCX-S8KeZLL_cRe834bmfEWlY8",
      authDomain: "container-tracker-app-4a7d5.firebaseapp.com",
      projectId: "container-tracker-app-4a7d5",
      storageBucket: "container-tracker-app-4a7d5.firebasestorage.app",
      messagingSenderId: "840635230641",
      appId: "1:840635230641:web:986f7472c844357b14b590"
    };
  }
} catch (error) {
  console.error("Error parsing Firebase config:", error);
  firebaseConfig = { apiKey: "INVALID_CONFIG", authDomain: "", projectId: "" };
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export { Timestamp };
export default app;

