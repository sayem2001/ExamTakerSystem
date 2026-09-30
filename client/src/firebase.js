// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBu6iw4a5nzvujImH086KfqJ3PSXUgBjoM",
  authDomain: "apexexam-d3e04.firebaseapp.com",
  projectId: "apexexam-d3e04",
  storageBucket: "apexexam-d3e04.firebasestorage.app",
  messagingSenderId: "490761038859",
  appId: "1:490761038859:web:b4867ab85e8ef16a082b0e",
  measurementId: "G-29ZZKH37ZQ"
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

export {
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
};

export default app;
