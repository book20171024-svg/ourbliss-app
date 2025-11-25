// 📌 FirebaseConfig.ts
// 👉 Please fill in your own Firebase config below.

import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

export const firebaseConfig = {
  apiKey: "【請填入】",
  authDomain: "【請填入】",
  projectId: "【請填入】",
  storageBucket: "【請填入】",
  messagingSenderId: "【請填入】",
  appId: "【請填入】"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with offline persistence
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

const storage = getStorage(app);
const auth = getAuth(app);

export { db, storage, auth };
