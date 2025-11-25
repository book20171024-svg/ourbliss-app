// firebaseConfig.ts
// Replace all placeholder fields with your real Firebase credentials.

import * as firebaseApp from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

export const firebaseConfig = {
  apiKey: "AIzaSyDzUK54VB7j9tL3c7IDAI7DDx0edJnsqg0",
  authDomain: "ourbliss-56668.firebaseapp.com",
  projectId: "ourbliss-56668",
  storageBucket: "ourbliss-56668.firebasestorage.app",
  messagingSenderId: "439046235502",
  appId: "1:439046235502:web:fa509eec3d03b77b194d7f"
};

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