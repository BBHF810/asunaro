// Firebase 初期化と設定
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDUC3y0zTQzkgqZZc6NnXEjlWCLFGK0G44",
  authDomain: "asunaro-95594.firebaseapp.com",
  projectId: "asunaro-95594",
  storageBucket: "asunaro-95594.firebasestorage.app",
  messagingSenderId: "878694045011",
  appId: "1:878694045011:web:98bb60cd56fc917b07bda6",
  measurementId: "G-QPNZFDS025"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export instances
export const db = getFirestore(app);
