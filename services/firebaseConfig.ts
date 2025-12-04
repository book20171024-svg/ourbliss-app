
// firebaseConfig.ts
import * as firebaseApp from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// Helper to safely access env vars in Vite
const getEnv = (key: string) => {
  try {
    // @ts-ignore
    return import.meta.env[key];
  } catch (e) {
    return "";
  }
};

// Use Environment Variables (Vercel)
export const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY"),
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnv("VITE_FIREBASE_APP_ID")
};

// CRITICAL: Check if apiKey is missing to prevent "auth/invalid-api-key" crash
if (!firebaseConfig.apiKey) {
  console.warn("⚠️ Firebase Config is missing! Please check your Vercel Environment Variables.");
  // Assign dummy values to prevent immediate crash during initialization
  // This allows the app to load and show UI, even if DB won't work
  firebaseConfig.apiKey = "AIzaSy_DUMMY_KEY_TO_PREVENT_CRASH";
  firebaseConfig.authDomain = "dummy-project.firebaseapp.com";
}

// ---- Initialize Firebase ----
const app = firebaseApp.initializeApp(firebaseConfig);

// ---- Enable Firestore Offline Persistence ----
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

// ---- Storage & Auth ----
const storage = getStorage(app);
const auth = getAuth(app);

// ---- Export to use in all pages ----
export { db, storage, auth };
