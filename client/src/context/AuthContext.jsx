import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  auth,
  googleProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut as firebaseSignOut,
} from '../firebase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('apex_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('apex_token');
      if (storedToken) {
        try {
          const res = await api.getMe();
          if (res.success && res.user) {
            setUser(res.user);
          }
        } catch (err) {
          console.error('Session restore failed:', err);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  /**
   * Google Sign-in / Registration (Guarantees real, verified identity)
   */
  const loginWithGoogle = async (metadata = {}) => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      const idToken = await fbUser.getIdToken();

      const res = await api.firebaseAuth({
        idToken,
        email: fbUser.email,
        name: fbUser.displayName || metadata.name || '',
        avatar: fbUser.photoURL || '',
        role: metadata.role || 'student',
        institution: metadata.institution || '',
        adminOtp: metadata.adminOtp || '',
        isEmailVerified: true, // Google verifies real email addresses
      });

      if (res.success && res.token) {
        localStorage.setItem('apex_token', res.token);
        setToken(res.token);
        setUser(res.user);
        return res.user;
      }
      throw new Error(res.message || 'Google authentication failed');
    } catch (err) {
      console.error('Google Auth error:', err);
      // Friendly message for popup close
      if (err.code === 'auth/popup-closed-by-user') {
        throw new Error('Google sign-in was cancelled. Please try again.');
      }
      if (err.code === 'auth/popup-blocked') {
        throw new Error('Sign-in popup was blocked by browser. Please allow popups for this site.');
      }
      throw err;
    }
  };

  /**
   * Register with Email & Password
   * Automatically dispatches Firebase Email Verification link
   */
  const registerWithEmail = async (name, email, password, role = 'student', institution = '', adminOtp = '') => {
    const trimmedEmail = email.trim().toLowerCase();

    // If registering as admin, validate that an adminOtp was provided
    if (role === 'admin' && !adminOtp.trim()) {
      throw new Error('Admin authorization code is required. Please request an OTP from the primary administrator.');
    }

    try {
      // 1. Create user in Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      const fbUser = userCredential.user;

      // 2. Send authentic Firebase email verification
      await sendEmailVerification(fbUser);

      // 3. Register user in backend DB with pending/unverified state
      await api.register(name, trimmedEmail, password, role, institution, adminOtp);

      // Sign out from Firebase session until they verify email
      await firebaseSignOut(auth).catch(() => {});

      return {
        needsEmailVerification: true,
        email: trimmedEmail,
        message: `A verification link has been sent to ${trimmedEmail}. Please check your inbox and verify your email before logging in.`,
      };
    } catch (err) {
      console.error('Register with email error:', err);
      if (err.code === 'auth/email-already-in-use') {
        throw new Error('An account with this email already exists. Please log in instead.');
      }
      if (err.code === 'auth/weak-password') {
        throw new Error('Password must be at least 6 characters.');
      }
      if (err.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      }
      throw err;
    }
  };

  /**
   * Login with Email & Password
   * Enforces that the user has verified their email address!
   */
  const loginWithEmail = async (email, password) => {
    const trimmedEmail = email.trim().toLowerCase();

    try {
      // Try Firebase authentication first
      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
      const fbUser = userCredential.user;

      // Reload user to get latest emailVerified state
      await fbUser.reload();

      if (!fbUser.emailVerified) {
        // Sign out Firebase session until verified
        await firebaseSignOut(auth).catch(() => {});
        const err = new Error(`Your email (${trimmedEmail}) is not verified yet. Please check your inbox and click the verification link before logging in.`);
        err.requiresEmailVerification = true;
        err.email = trimmedEmail;
        throw err;
      }

      // Verified! Sync with backend and obtain JWT
      const idToken = await fbUser.getIdToken();
      const res = await api.firebaseAuth({
        idToken,
        email: fbUser.email,
        name: fbUser.displayName || '',
        isEmailVerified: true,
      });

      if (res.success && res.token) {
        localStorage.setItem('apex_token', res.token);
        setToken(res.token);
        setUser(res.user);
        return res.user;
      }
      throw new Error(res.message || 'Login failed');
    } catch (err) {
      if (err.requiresEmailVerification) {
        throw err;
      }

      // If user not in Firebase (e.g. legacy direct DB account), try legacy backend login
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || !err.code) {
        try {
          const res = await api.login(trimmedEmail, password);
          if (res.success && res.token) {
            localStorage.setItem('apex_token', res.token);
            setToken(res.token);
            setUser(res.user);
            return res.user;
          }
        } catch (legacyErr) {
          throw new Error(legacyErr.message || 'Invalid email or password.');
        }
      }

      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        throw new Error('Invalid email or password.');
      }
      throw err;
    }
  };

  /**
   * Resend Verification Email
   */
  const resendVerificationEmail = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      await sendEmailVerification(userCredential.user);
      await firebaseSignOut(auth).catch(() => {});
      return true;
    } catch (err) {
      console.error('Failed to resend verification email:', err);
      throw new Error(err.message || 'Failed to resend verification email. Please verify credentials.');
    }
  };

  /**
   * Standard legacy login fallback
   */
  const login = async (email, password) => {
    return loginWithEmail(email, password);
  };

  /**
   * Standard legacy register fallback
   */
  const register = async (name, email, password, role = 'student', institution = '', adminOtp = '') => {
    return registerWithEmail(name, email, password, role, institution, adminOtp);
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      // Non-fatal
    }
    localStorage.removeItem('apex_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        loginWithEmail,
        loginWithGoogle,
        register,
        registerWithEmail,
        resendVerificationEmail,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
