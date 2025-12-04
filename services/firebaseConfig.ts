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

// -------------------------------------------------------
// 🔥 正確：Vite + Vercel 的環境變數讀取方式：固定 key 取值
// -------------------------------------------------------
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// -------------------------------------------------------
// ❗ 若環境變數讀不到（例如 Vercel 未設定、key 空值）→ 給提示
// -------------------------------------------------------
if (!firebaseConfig.apiKey) {
  console.warn("⚠️ Firebase Config is missing! Please check your Vercel Environment Variables.");
}

// -------------------------------------------------------
// 🔥 初始化 Firebase
// -------------------------------------------------------
const app = firebaseApp.initializeApp(firebaseConfig);

// 使用 Firestore + 離線緩存
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

const storage = getStorage(app);
const auth = getAuth(app);

// 導出
export { db, storage, auth };
