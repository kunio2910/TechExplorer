"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAnalytics, type Analytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

/**
 * Public Firebase web-app configuration for TechExplorer.
 *
 * Firebase web configuration values are intended to be shipped to the
 * browser. Firestore and Storage access must still be protected with Firebase
 * Authentication and Security Rules.
 */
export const firebaseConfig = {
  apiKey: "AIzaSyDDE3KtpMwGihC6-5iHA6fnq6hFhGfkjWM",
  authDomain: "techexplorer-38d83.firebaseapp.com",
  projectId: "techexplorer-38d83",
  storageBucket: "techexplorer-38d83.firebasestorage.app",
  messagingSenderId: "272953603315",
  appId: "1:272953603315:web:ba0bbb3ba08a16876d3386",
  measurementId: "G-5CV7HTHNRM",
} as const;

export const firebaseApp = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);

// Analytics is browser-only and can be unavailable in privacy-restricted
// browsers, so it must never prevent the Explorer from loading.
let analytics: Analytics | null = null;
if (typeof window !== "undefined") {
  try {
    analytics = getAnalytics(firebaseApp);
  } catch {
    analytics = null;
  }
}

export { analytics };
