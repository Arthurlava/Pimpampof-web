import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDuYvtJbjj0wQbSwIBtyHuPeF71poPIBUg",
  authDomain: "pimpampof-aec32.firebaseapp.com",
  databaseURL: "https://pimpampof-aec32-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "pimpampof-aec32",
  storageBucket: "pimpampof-aec32.firebasestorage.app",
  messagingSenderId: "872484746189",
  appId: "1:872484746189:web:a76c7345c4f2ebb6790a84",
};

const firebaseApp = initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
export const db = getDatabase(firebaseApp);
export const AUTH_READY_EVENT = "ppp-auth-ready";

onAuthStateChanged(auth, (user) => {
  if (!user) {
    signInAnonymously(auth).catch((error) => {
      console.error("Anon sign-in failed:", error);
    });
    return;
  }

  window.dispatchEvent(new Event(AUTH_READY_EVENT));
});
