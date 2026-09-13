/**
 * ALTRIXWEAR Firebase Admin SDK Server-Side Module
 * Service Account: firebase-adminsdk-fbsvc@altrixwear-dd612.iam.gserviceaccount.com
 * Project ID: altrixwear-dd612
 * 
 * Used for administrative server-side authentication, token verification,
 * and direct root Cloud Firestore database operations in Vercel Serverless Functions.
 */

let admin;
try {
  admin = require('firebase-admin');
} catch (e) {
  // If running in environment without node_modules installed yet
  admin = null;
}

const SERVICE_ACCOUNT = {
  projectId: process.env.FIREBASE_PROJECT_ID || 'altrixwear-dd612',
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-fbsvc@altrixwear-dd612.iam.gserviceaccount.com',
  privateKey: process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined
};

let app = null;
let db = null;
let auth = null;

function getFirebaseAdmin() {
  if (!admin) {
    return { admin: null, db: null, auth: null, isInitialized: false };
  }

  if (!app) {
    if (!admin.apps.length) {
      if (SERVICE_ACCOUNT.privateKey) {
        app = admin.initializeApp({
          credential: admin.credential.cert(SERVICE_ACCOUNT),
          projectId: SERVICE_ACCOUNT.projectId
        });
      } else {
        // Application Default Credentials or Project ID fallback
        app = admin.initializeApp({
          projectId: SERVICE_ACCOUNT.projectId
        });
      }
    } else {
      app = admin.apps[0];
    }
    db = admin.firestore();
    auth = admin.auth();
  }

  return {
    admin,
    app,
    db,
    auth,
    isInitialized: true,
    serviceAccountEmail: SERVICE_ACCOUNT.clientEmail,
    projectId: SERVICE_ACCOUNT.projectId
  };
}

module.exports = {
  getFirebaseAdmin,
  SERVICE_ACCOUNT
};
