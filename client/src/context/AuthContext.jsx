import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  auth,
  googleProvider,
  facebookProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut as firebaseSignOut,
} from '../firebase';

const AuthContext = createContext(null);

const isMobileBrowser = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(
    navigator.userAgent || ''
  );
};

/**
 * Diagnostic helper to format OAuth and Firebase Authentication errors into
 * clear, actionable instructions for the user.
 */
const formatOAuthError = (err, providerName = 'OAuth') => {
  if (!err) return `${providerName} authentication failed.`;

  const code = err.code || '';
  const message = err.message || '';

  if (
    code === 'auth/operation-not-allowed' ||
    message.includes('operation-not-allowed') ||
    message.includes('OPERATION_NOT_ALLOWED')
  ) {
    return `${providerName} Sign-In is not enabled yet in your Firebase project. Please go to Firebase Console -> Authentication -> Sign-in method and enable ${providerName}.`;
  }
  if (code === 'auth/popup-closed-by-user') {
    return `${providerName} sign-in window was closed before completing. If you did not close it, please ensure your browser allows pop-ups and third-party storage for this domain.`;
  }
  if (code === 'auth/popup-blocked') {
    const origin = typeof window !== 'undefined' ? (window.location.host || 'this site') : 'this site';
    return `Sign-in pop-up was blocked by your browser. Please allow pop-ups for ${origin} or use redirect sign-in.`;
  }
  if (code === 'auth/unauthorized-domain' || message.includes('unauthorized-domain')) {
    const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'current domain';
    return `This domain (${currentDomain}) is not authorized in Firebase Console -> Authentication -> Settings -> Authorized domains. Please add '${currentDomain}' to the list.`;
  }
  if (code === 'auth/account-exists-with-different-credential') {
    return 'An account already exists with this email using a different sign-in method. Please sign in using your existing method.';
  }
  if (code === 'auth/cancelled-popup-request') {
    return 'Another sign-in pop-up is already opening. Please wait a moment and try again.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network connection error while connecting to authentication service. Please check your internet connection.';
  }

  return message || `${providerName} authentication failed.`;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('apex_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      // 1. Check if user is returning from a mobile OAuth redirect (Google / Facebook)
      try {
        const redirectResult = await getRedirectResult(auth);
        if (redirectResult && redirectResult.user) {
          const fbUser = redirectResult.user;
          const idToken = await fbUser.getIdToken();

          let pendingReg = {};
          try {
            const raw = localStorage.getItem('apex_pending_oauth_reg');
            if (raw) {
              pendingReg = JSON.parse(raw);
              localStorage.removeItem('apex_pending_oauth_reg');
            }
          } catch (e) {
            // Non-fatal
          }

          const providerId = fbUser.providerData?.[0]?.providerId || '';
          const authProvider = providerId.includes('facebook') ? 'facebook' : 'google';

          const res = await api.firebaseAuth({
            idToken,
            email: fbUser.email,
            name: fbUser.displayName || pendingReg.name || '',
            avatar: fbUser.photoURL || '',
            role: pendingReg.role || 'student',
            institution: pendingReg.institution || '',
            adminOtp: pendingReg.adminOtp || '',
            authProvider,
            isEmailVerified: true,
          });

          if (res.success && res.token) {
            localStorage.setItem('apex_token', res.token);
            setToken(res.token);
            setUser(res.user);
            setLoading(false);
            return;
          }
        }
      } catch (redirectErr) {
        console.warn('OAuth redirect resolution failed or was cancelled:', redirectErr);
      }

      // 2. Otherwise restore existing stored JWT session
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
   * Falls back smoothly to redirect on mobile devices or popup blockers.
   */
  const loginWithGoogle = async (metadata = {}, forceRedirect = false) => {
    try {
      if (forceRedirect) {
        if (metadata && Object.keys(metadata).length > 0) {
          localStorage.setItem('apex_pending_oauth_reg', JSON.stringify(metadata));
        }
        await signInWithRedirect(auth, googleProvider);
        return { isRedirecting: true };
      }

      let fbUser;
      try {
        const result = await signInWithPopup(auth, googleProvider);
        fbUser = result.user;
      } catch (popupErr) {
        if (
          popupErr.code === 'auth/popup-blocked' ||
          popupErr.code === 'auth/cancelled-popup-request' ||
          (isMobileBrowser() && popupErr.code === 'auth/popup-closed-by-user')
        ) {
          console.warn('Google popup unavailable on mobile; switching to redirect flow...');
          if (metadata && Object.keys(metadata).length > 0) {
            localStorage.setItem('apex_pending_oauth_reg', JSON.stringify(metadata));
          }
          await signInWithRedirect(auth, googleProvider);
          return { isRedirecting: true };
        }
        throw popupErr;
      }

      if (!fbUser) return null;
      const idToken = await fbUser.getIdToken();

      const res = await api.firebaseAuth({
        idToken,
        email: fbUser.email,
        name: fbUser.displayName || metadata.name || '',
        avatar: fbUser.photoURL || '',
        role: metadata.role || 'student',
        institution: metadata.institution || '',
        adminOtp: metadata.adminOtp || '',
        authProvider: 'google',
        isEmailVerified: true,
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
      throw new Error(formatOAuthError(err, 'Google'));
    }
  };

  /**
   * Facebook Sign-in / Registration
   * Falls back smoothly to redirect on mobile devices or popup blockers.
   */
  const loginWithFacebook = async (metadata = {}, forceRedirect = false) => {
    try {
      if (forceRedirect) {
        if (metadata && Object.keys(metadata).length > 0) {
          localStorage.setItem('apex_pending_oauth_reg', JSON.stringify(metadata));
        }
        await signInWithRedirect(auth, facebookProvider);
        return { isRedirecting: true };
      }

      let fbUser;
      try {
        const result = await signInWithPopup(auth, facebookProvider);
        fbUser = result.user;
      } catch (popupErr) {
        if (
          popupErr.code === 'auth/popup-blocked' ||
          popupErr.code === 'auth/cancelled-popup-request' ||
          (isMobileBrowser() && popupErr.code === 'auth/popup-closed-by-user')
        ) {
          console.warn('Facebook popup unavailable on mobile; switching to redirect flow...');
          if (metadata && Object.keys(metadata).length > 0) {
            localStorage.setItem('apex_pending_oauth_reg', JSON.stringify(metadata));
          }
          await signInWithRedirect(auth, facebookProvider);
          return { isRedirecting: true };
        }
        throw popupErr;
      }

      if (!fbUser) return null;
      const idToken = await fbUser.getIdToken();

      const res = await api.firebaseAuth({
        idToken,
        email: fbUser.email,
        name: fbUser.displayName || metadata.name || '',
        avatar: fbUser.photoURL || '',
        role: metadata.role || 'student',
        institution: metadata.institution || '',
        adminOtp: metadata.adminOtp || '',
        authProvider: 'facebook',
        isEmailVerified: true,
      });

      if (res.success && res.token) {
        localStorage.setItem('apex_token', res.token);
        setToken(res.token);
        setUser(res.user);
        return res.user;
      }
      throw new Error(res.message || 'Facebook authentication failed');
    } catch (err) {
      console.error('Facebook Auth error:', err);
      throw new Error(formatOAuthError(err, 'Facebook'));
    }
  };

  /**
   * Register with Email & Password
   * Automatically dispatches Firebase Email Verification link when Firebase is enabled,
   * with graceful fallback to backend DB registration if Firebase email provider is inactive.
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

      // Fallback: If Firebase Email/Password provider is disabled in Firebase Console (auth/operation-not-allowed),
      // smoothly register in the backend database so the user is never stuck
      if (err.code === 'auth/operation-not-allowed' || err.message?.includes('operation-not-allowed')) {
        console.warn('Firebase Email provider disabled in console. Registering directly in backend DB.');
        const res = await api.register(name, trimmedEmail, password, role, institution, adminOtp);
        if (res.success && res.token) {
          localStorage.setItem('apex_token', res.token);
          setToken(res.token);
          setUser(res.user);
          return {
            needsEmailVerification: false,
            user: res.user,
            message: 'Registered successfully!',
          };
        }
        throw new Error(res.message || 'Registration failed');
      }

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
   * Enforces that the user has verified their email address when using Firebase,
   * or falls back to backend DB if Firebase email is inactive.
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

      // If Firebase Email/Password is disabled in console (auth/operation-not-allowed),
      // or user is a direct DB account, try backend login
      if (
        err.code === 'auth/operation-not-allowed' ||
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/invalid-credential' ||
        !err.code
      ) {
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
        loginWithFacebook,
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
