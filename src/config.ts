// Import the functions you need from the SDKs you need

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { setLogLevel } from "firebase/firestore";

// IMPORTANT: If you get "auth/unauthorized-domain" error after deploying to Vercel:
// 1. Go to Firebase Console: https://console.firebase.google.com/project/steam-outlet-425507-t1/authentication/settings
// 2. Click "Authorized domains" tab
// 3. Add your Vercel domain (e.g., your-app.vercel.app)
// 4. Click "Add"

// Dynamic Backend URL Configuration
// Automatically detects development vs production environment
const getBackendUrl = () => {
  // Check if we're in production (Vercel)
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    // Production: Use relative URL (same domain as frontend)
    return '';
  }
  // Development: Use localhost
  return 'http://localhost:5000';
};

export const BACKEND_URL = getBackendUrl();

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBGjoRRDjXLsmX-hxdQEKez4CxHkIbCcWU",
  authDomain: "steam-outlet-425507-t1.firebaseapp.com",
  projectId: "steam-outlet-425507-t1",
  storageBucket: "steam-outlet-425507-t1.firebasestorage.app",
  messagingSenderId: "925599253452",
  appId: "1:925599253452:web:d4abc6968b07bb95131369",
  measurementId: "G-3YPK4FWRH9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);
const storage = getStorage(app);
// setLogLevel('debug'); // Commented out to avoid potential issues

export { auth, provider, db, storage };

