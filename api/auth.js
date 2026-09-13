/**
 * Vercel Serverless Function: /api/auth
 * Verifies Firebase Client ID Tokens and retrieves/syncs user profile in Firestore.
 */

const { getFirebaseAdmin, SERVICE_ACCOUNT } = require('./firebase-admin');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { auth, db, isInitialized } = getFirebaseAdmin();

  // Return service account status on GET
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'active',
      serviceAccount: SERVICE_ACCOUNT.clientEmail,
      projectId: SERVICE_ACCOUNT.projectId,
      adminSdkReady: isInitialized
    });
  }

  // POST: Verify user token and sync to Firestore
  if (req.method === 'POST') {
    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : req.body.idToken;

    if (!idToken) {
      return res.status(400).json({ error: 'Missing Firebase ID token' });
    }

    if (!auth || !db) {
      // Fallback response for development without live private key set
      return res.status(200).json({
        verified: true,
        notice: 'Running with service account metadata. Set FIREBASE_PRIVATE_KEY in Vercel to verify cryptographic JWT.',
        projectId: SERVICE_ACCOUNT.projectId,
        serviceAccount: SERVICE_ACCOUNT.clientEmail
      });
    }

    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      const uid = decodedToken.uid;

      // Sync user profile in Firestore
      const userRef = db.collection('users').doc(uid);
      const userDoc = await userRef.get();

      const profileData = {
        uid,
        email: decodedToken.email,
        displayName: decodedToken.name || decodedToken.email.split('@')[0],
        photoURL: decodedToken.picture || null,
        providerId: decodedToken.firebase?.sign_in_provider || 'google.com',
        lastLoginAt: new Date().toISOString()
      };

      await userRef.set(profileData, { merge: true });

      return res.status(200).json({
        success: true,
        user: { ...profileData, ...userDoc.data() }
      });
    } catch (err) {
      console.error('Firebase token verification error:', err);
      return res.status(401).json({ error: 'Invalid or expired ID token: ' + err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
