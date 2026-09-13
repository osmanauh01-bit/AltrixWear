/**
 * ALTRIXWEAR Firebase Authentication & Cloud Firestore Database Service
 * 
 * Connected to Firebase Project: altrixwear-dd612
 * Service Account: firebase-adminsdk-fbsvc@altrixwear-dd612.iam.gserviceaccount.com
 * 
 * Features:
 * - Real Google Sign-In via Firebase Auth (GoogleAuthProvider popup & redirect)
 * - Real Apple ID Sign-In via Firebase Auth (OAuthProvider 'apple.com' popup & redirect)
 * - Real Email & Password Authentication & Registration
 * - Cloud Firestore Database Operations:
 *   - Real User Profiles (collection 'users')
 *   - Real Customer Delivery Addresses (collection 'users/{uid}/addresses')
 *   - Real Customer Orders (collection 'users/{uid}/orders')
 * - ZERO random or demo users. All data strictly derived from authenticated Firebase state.
 */

(function () {
  'use strict';

  // Purge any legacy simulated demo accounts immediately
  try {
    const cachedUser = localStorage.getItem('altrixwear_auth_user');
    if (cachedUser) {
      if (cachedUser.includes('alex.mercer') || cachedUser.includes('jordan.vance') || cachedUser.includes('simUser') || cachedUser.includes('apple_') || cachedUser.includes('google_')) {
        localStorage.removeItem('altrixwear_auth_user');
      }
    }
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('altrixwear_firestore_profile_google_') || key.startsWith('altrixwear_firestore_profile_apple_') || key.startsWith('altrixwear_firestore_orders_') || key.startsWith('altrixwear_firestore_address_'))) {
        localStorage.removeItem(key);
      }
    }
  } catch (e) {}

  // Authentic Firebase Project Configuration (altrixwear-dd612)
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyAF9rMH-nBuJTeG8BHREQNQETzCuzI2el4",
    authDomain: "altrixwear-dd612.firebaseapp.com",
    projectId: "altrixwear-dd612",
    storageBucket: "altrixwear-dd612.firebasestorage.app",
    messagingSenderId: "704109604460",
    appId: "1:704109604460:web:c8c6a5e47025c61b75f249",
    measurementId: "G-XGS4LEL2HR"
  };

  function getActiveApiKey() {
    return FIREBASE_CONFIG.apiKey;
  }

  function buildFirebaseConfig() {
    return FIREBASE_CONFIG;
  }

  let app = null;
  let auth = null;
  let db = null;
  let googleProvider = null;
  let appleProvider = null;

  const authListeners = [];

  function notifyAuthListeners(user) {
    authListeners.forEach(cb => {
      try { cb(user); } catch (e) { console.error('Auth listener error:', e); }
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('altrix:auth-changed', { detail: { user } }));
    }
  }

  const STORAGE_USER_KEY = 'altrixwear_auth_user';

  function getStoredUser() {
    try {
      const data = localStorage.getItem(STORAGE_USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  function setStoredUser(user) {
    try {
      if (user) {
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_USER_KEY);
      }
    } catch (e) {}
  }

  // Initialize Firebase instance
  function initFirebase() {
    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK compat scripts not yet loaded.');
      return false;
    }

    const config = buildFirebaseConfig();
    if (!config.apiKey) {
      return false;
    }

    try {
      if (!firebase.apps || !firebase.apps.length) {
        app = firebase.initializeApp(config);
      } else {
        app = firebase.app();
      }

      if (firebase.auth) {
        auth = firebase.auth();
        googleProvider = new firebase.auth.GoogleAuthProvider();
        googleProvider.setCustomParameters({ prompt: 'select_account' });
        appleProvider = new firebase.auth.OAuthProvider('apple.com');
        appleProvider.addScope('email');
        appleProvider.addScope('name');

        // Real Firebase Auth State Observer
        auth.onAuthStateChanged(async (firebaseUser) => {
          if (firebaseUser) {
            const providerInfo = firebaseUser.providerData && firebaseUser.providerData[0];
            const userObj = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || (providerInfo && providerInfo.email) || '',
              displayName: firebaseUser.displayName || (providerInfo && providerInfo.displayName) || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Member'),
              photoURL: firebaseUser.photoURL || (providerInfo && providerInfo.photoURL) || null,
              providerId: (providerInfo && providerInfo.providerId) || 'password',
              emailVerified: firebaseUser.emailVerified
            };

            setStoredUser(userObj);

            // Fetch or create profile in Cloud Firestore database
            try {
              const liveProfile = await AltrixDatabase.syncUserProfile(userObj);
              if (liveProfile && liveProfile.membershipTier) {
                userObj.membershipTier = liveProfile.membershipTier;
              }
            } catch (syncErr) {
              console.warn('Profile sync warning:', syncErr);
            }

            notifyAuthListeners(userObj);
          } else {
            setStoredUser(null);
            notifyAuthListeners(null);
          }
        });
      }

      if (firebase.firestore) {
        db = firebase.firestore();
      }

      return true;
    } catch (e) {
      console.warn('Firebase initialization notice:', e.message);
      return false;
    }
  }

  // Attempt initial setup
  initFirebase();

  // =========================================================================
  // AUTHENTICATION SERVICES (Real Firebase Auth Only - No Random/Demo Users)
  // =========================================================================
  const AltrixAuth = {
    isConfigured: function () {
      return !!(auth && getActiveApiKey());
    },

    setApiKey: function (key) {
      if (!key) return false;
      const cleanKey = key.trim();
      localStorage.setItem('ALTRIX_FIREBASE_API_KEY', cleanKey);
      window.ALTRIX_FIREBASE_API_KEY = cleanKey;
      return initFirebase();
    },

    getCurrentUser: function () {
      if (auth && auth.currentUser) {
        const u = auth.currentUser;
        const providerInfo = u.providerData && u.providerData[0];
        return {
          uid: u.uid,
          email: u.email || (providerInfo && providerInfo.email) || '',
          displayName: u.displayName || (providerInfo && providerInfo.displayName) || (u.email ? u.email.split('@')[0] : 'Member'),
          photoURL: u.photoURL || (providerInfo && providerInfo.photoURL) || null,
          providerId: (providerInfo && providerInfo.providerId) || 'password'
        };
      }
      return getStoredUser();
    },

    onAuthStateChanged: function (callback) {
      authListeners.push(callback);
      const current = this.getCurrentUser();
      setTimeout(() => callback(current), 0);
      return () => {
        const idx = authListeners.indexOf(callback);
        if (idx !== -1) authListeners.splice(idx, 1);
      };
    },

    /**
     * Sign In with Google (Real Firebase OAuth)
     */
    signInWithGoogle: async function () {
      if (!this.isConfigured()) {
        const key = prompt('Please enter your Firebase Web API Key for project altrixwear-dd612 (from Firebase Console > Project Settings > General):');
        if (key && key.trim()) {
          this.setApiKey(key.trim());
        } else {
          return {
            success: false,
            error: 'Firebase Web API Key is required to connect to project altrixwear-dd612. Please provide your Web API Key from Firebase Console.'
          };
        }
      }

      if (!auth || !googleProvider) {
        return {
          success: false,
          error: 'Firebase Auth is not initialized. Please ensure your Firebase Web API Key is valid.'
        };
      }

      try {
        const result = await auth.signInWithPopup(googleProvider);
        const user = result.user;
        const providerInfo = user.providerData && user.providerData[0];

        const userObj = {
          uid: user.uid,
          email: user.email || (providerInfo && providerInfo.email) || '',
          displayName: user.displayName || (providerInfo && providerInfo.displayName) || user.email.split('@')[0],
          photoURL: user.photoURL || (providerInfo && providerInfo.photoURL) || null,
          providerId: 'google.com'
        };

        setStoredUser(userObj);
        await AltrixDatabase.syncUserProfile(userObj);
        notifyAuthListeners(userObj);
        return { success: true, user: userObj };
      } catch (error) {
        console.error('Firebase Google Sign-In error:', error);
        if (error.code === 'auth/popup-blocked') {
          try {
            await auth.signInWithRedirect(googleProvider);
            return { success: true, pendingRedirect: true };
          } catch (redirErr) {
            return { success: false, error: redirErr.message, code: redirErr.code };
          }
        }
        return { success: false, error: error.message, code: error.code };
      }
    },

    /**
     * Sign In with Apple (Real Firebase Apple OAuth)
     */
    signInWithApple: async function () {
      if (!this.isConfigured()) {
        const key = prompt('Please enter your Firebase Web API Key for project altrixwear-dd612 (from Firebase Console > Project Settings > General):');
        if (key && key.trim()) {
          this.setApiKey(key.trim());
        } else {
          return {
            success: false,
            error: 'Firebase Web API Key is required to connect to project altrixwear-dd612. Please provide your Web API Key from Firebase Console.'
          };
        }
      }

      if (!auth || !appleProvider) {
        return {
          success: false,
          error: 'Firebase Auth is not initialized. Please ensure your Firebase Web API Key is valid.'
        };
      }

      try {
        const result = await auth.signInWithPopup(appleProvider);
        const user = result.user;
        const providerInfo = user.providerData && user.providerData[0];

        const userObj = {
          uid: user.uid,
          email: user.email || (providerInfo && providerInfo.email) || '',
          displayName: user.displayName || (providerInfo && providerInfo.displayName) || 'Apple Customer',
          photoURL: user.photoURL || null,
          providerId: 'apple.com'
        };

        setStoredUser(userObj);
        await AltrixDatabase.syncUserProfile(userObj);
        notifyAuthListeners(userObj);
        return { success: true, user: userObj };
      } catch (error) {
        console.error('Firebase Apple Sign-In error:', error);
        if (error.code === 'auth/popup-blocked') {
          try {
            await auth.signInWithRedirect(appleProvider);
            return { success: true, pendingRedirect: true };
          } catch (redirErr) {
            return { success: false, error: redirErr.message, code: redirErr.code };
          }
        }
        return { success: false, error: error.message, code: error.code };
      }
    },

    /**
     * Email & Password Sign In
     */
    signInWithEmail: async function (email, password) {
      if (!this.isConfigured()) {
        const key = prompt('Please enter your Firebase Web API Key for project altrixwear-dd612:');
        if (key && key.trim()) {
          this.setApiKey(key.trim());
        } else {
          return { success: false, error: 'Firebase Web API Key is required for project altrixwear-dd612.' };
        }
      }

      if (!auth) {
        return { success: false, error: 'Firebase Auth is not initialized.' };
      }

      try {
        const res = await auth.signInWithEmailAndPassword(email, password);
        const userObj = {
          uid: res.user.uid,
          email: res.user.email,
          displayName: res.user.displayName || email.split('@')[0],
          photoURL: res.user.photoURL,
          providerId: 'password'
        };
        setStoredUser(userObj);
        await AltrixDatabase.syncUserProfile(userObj);
        notifyAuthListeners(userObj);
        return { success: true, user: userObj };
      } catch (err) {
        return { success: false, error: err.message, code: err.code };
      }
    },

    /**
     * Register New Account with Email & Password
     */
    registerWithEmail: async function (firstName, lastName, email, password) {
      const displayName = `${firstName} ${lastName}`.trim();
      if (!this.isConfigured()) {
        const key = prompt('Please enter your Firebase Web API Key for project altrixwear-dd612:');
        if (key && key.trim()) {
          this.setApiKey(key.trim());
        } else {
          return { success: false, error: 'Firebase Web API Key is required for project altrixwear-dd612.' };
        }
      }

      if (!auth) {
        return { success: false, error: 'Firebase Auth is not initialized.' };
      }

      try {
        const res = await auth.createUserWithEmailAndPassword(email, password);
        if (res.user.updateProfile) {
          await res.user.updateProfile({ displayName });
        }
        const userObj = {
          uid: res.user.uid,
          email: res.user.email,
          displayName: displayName,
          photoURL: null,
          providerId: 'password'
        };
        setStoredUser(userObj);
        await AltrixDatabase.syncUserProfile(userObj);
        notifyAuthListeners(userObj);
        return { success: true, user: userObj };
      } catch (err) {
        return { success: false, error: err.message, code: err.code };
      }
    },

    /**
     * Password Reset
     */
    sendPasswordReset: async function (email) {
      if (!auth) {
        return { success: false, error: 'Firebase Auth is not initialized.' };
      }
      try {
        await auth.sendPasswordResetEmail(email);
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message, code: err.code };
      }
    },

    /**
     * Sign Out
     */
    signOut: async function () {
      if (auth) {
        try {
          await auth.signOut();
        } catch (e) {}
      }
      setStoredUser(null);
      notifyAuthListeners(null);
      return { success: true };
    }
  };

  // =========================================================================
  // CLOUD FIRESTORE DATABASE SERVICE (Real Database Only)
  // =========================================================================
  const AltrixDatabase = {
    /**
     * Synchronize and retrieve user profile document from Firestore 'users/{uid}'
     */
    syncUserProfile: async function (user) {
      if (!user || !user.uid) return null;

      if (!db) {
        return {
          uid: user.uid,
          displayName: user.displayName || '',
          email: user.email || '',
          photoURL: user.photoURL || '',
          providerId: user.providerId || 'password',
          membershipTier: 'ALTRIX CLUB â€¢ VIP ACCESS'
        };
      }

      try {
        const userDocRef = db.collection('users').doc(user.uid);
        const doc = await userDocRef.get();

        if (doc.exists) {
          const existingData = doc.data();
          return {
            ...existingData,
            displayName: user.displayName || existingData.displayName,
            photoURL: user.photoURL || existingData.photoURL
          };
        } else {
          const newProfile = {
            uid: user.uid,
            displayName: user.displayName || '',
            email: user.email || '',
            photoURL: user.photoURL || '',
            providerId: user.providerId || 'password',
            membershipTier: 'ALTRIX CLUB â€¢ VIP ACCESS',
            createdAt: firebase.firestore.FieldValue ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
          };
          await userDocRef.set(newProfile, { merge: true });
          return newProfile;
        }
      } catch (err) {
        console.warn('Firestore syncUserProfile warning:', err.message);
        return null;
      }
    },

    /**
     * Get user profile document directly from Firestore
     */
    getUserProfile: async function (uid) {
      if (!uid || !db) return null;
      try {
        const doc = await db.collection('users').doc(uid).get();
        if (doc.exists) {
          return doc.data();
        }
        return null;
      } catch (e) {
        console.warn('Firestore getUserProfile error:', e.message);
        return null;
      }
    },

    /**
     * Save Customer Address directly into Firestore: users/{uid}/addresses/default
     */
    saveAddress: async function (uid, address) {
      if (!uid) return { success: false, error: 'Customer is not authenticated.' };

      const payload = {
        fullName: address.fullName || '',
        street: address.street || '',
        city: address.city || '',
        state: address.state || '',
        zip: address.zip || '',
        phone: address.phone || '',
        updatedAt: new Date().toISOString()
      };

      if (!db) {
        return { success: false, error: 'Cloud Firestore database connection is not active.' };
      }

      try {
        await db.collection('users').doc(uid).collection('addresses').doc('default').set(payload, { merge: true });
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    },

    /**
     * Retrieve Customer Address from Firestore: users/{uid}/addresses/default
     */
    getAddress: async function (uid) {
      if (!uid || !db) return null;
      try {
        const doc = await db.collection('users').doc(uid).collection('addresses').doc('default').get();
        if (doc.exists) {
          return doc.data();
        }
        return null;
      } catch (e) {
        console.warn('Firestore getAddress error:', e.message);
        return null;
      }
    },

    /**
     * Retrieve Customer Orders from Firestore: users/{uid}/orders
     */
    getUserOrders: async function (uid) {
      if (!uid || !db) return [];
      try {
        const snapshot = await db.collection('users').doc(uid).collection('orders').get();
        const orders = [];
        snapshot.forEach(doc => {
          orders.push({ id: doc.id, ...doc.data() });
        });
        return orders;
      } catch (e) {
        console.warn('Firestore getUserOrders error:', e.message);
        return [];
      }
    },

    /**
     * Save / Add new order to Firestore
     */
    saveOrder: async function (uid, orderData) {
      if (!uid) return { success: false, error: 'User UID required' };
      if (!db) return { success: false, error: 'Database not initialized' };

      const orderId = orderData.orderNumber || ('#AX' + Math.floor(1000 + Math.random() * 9000));
      const orderPayload = {
        ...orderData,
        orderNumber: orderId,
        createdAt: new Date().toISOString()
      };

      try {
        await db.collection('users').doc(uid).collection('orders').doc(orderId.replace('#', '')).set(orderPayload);
        return { success: true, order: orderPayload };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
  };

  // Expose services to global window
  window.AltrixAuth = AltrixAuth;
  window.AltrixDatabase = AltrixDatabase;

})();