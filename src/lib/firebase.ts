
// This file is intentionally left with a mock setup.
// In a real Firebase app, you would initialize Firebase here.
// To re-enable Firebase, you would uncomment the code below and fill in your config.
/*
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && !(auth as any).emulatorConfig) {
    // Set up emulators
    // connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
    // connectFirestoreEmulator(db, "localhost", 8080);
}


export { app, auth, db };
*/

// Mock exports for when Firebase is not used.
export const app = {};
export const auth = {};
export const db = {};
