import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// =====================================================
// HƯỚNG DẪN SETUP FIREBASE:
// 1. Vào https://console.firebase.google.com/
// 2. Tạo project mới (hoặc dùng project có sẵn)
// 3. Vào Project Settings > General > Your apps > Add app > Web
// 4. Copy config vào đây HOẶC tạo file .env và dùng import.meta.env
// 5. Trong Firebase Console: Build > Realtime Database > Create Database
//    - Chọn vị trí (Asia Southeast 1 - Singapore)
//    - Chọn "Start in test mode" (rules cho phép read/write)
// =====================================================

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
