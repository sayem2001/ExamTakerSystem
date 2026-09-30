// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "apexexam-d3e04.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "apexexam-d3e04",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "apexexam-d3e04.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "490761038859",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:490761038859:web:b4867ab85e8ef16a082b0e",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-29ZZKH37ZQ",
};

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Firebase Analytics if supported in the browser environment
export let analytics = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {
    // Non-fatal if analytics is blocked by ad-blocker or unsupported
  });
}

// Initialize Auth
export const auth = getAuth(app);

// Configure Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Configure Facebook Auth Provider
export const facebookProvider = new FacebookAuthProvider();
facebookProvider.addScope('email');
facebookProvider.addScope('public_profile');
facebookProvider.setCustomParameters({
  display: 'popup',
});

export {
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
};

export default app;
