import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

export type FirebaseClients = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
};

let browserClients: FirebaseClients | null = null;

export function getFirebaseClients(): FirebaseClients | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  if (!apiKey || !authDomain || !projectId || !appId) return null;
  if (browserClients) return browserClients;

  const app = getApps().length
    ? getApp()
    : initializeApp({
        apiKey,
        authDomain,
        projectId,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId,
      });

  browserClients = {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
  };

  return browserClients;
}
