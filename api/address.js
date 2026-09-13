/**
 * Vercel Serverless Function: /api/address
 * Manages customer shipping address in Cloud Firestore via Firebase Admin SDK.
 */

const { getFirebaseAdmin, SERVICE_ACCOUNT } = require('./firebase-admin');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { db } = getFirebaseAdmin();

  // GET: Fetch customer default address
  if (req.method === 'GET') {
    const { uid } = req.query;
    if (!uid) {
      return res.status(400).json({ error: 'Missing uid' });
    }

    if (!db) {
      return res.status(200).json({ address: null });
    }

    try {
      const doc = await db.collection('users').doc(uid).collection('addresses').doc('default').get();
      if (!doc.exists) {
        return res.status(404).json({ error: 'No address found' });
      }
      return res.status(200).json({ address: doc.data() });
    } catch (err) {
      console.error('Firestore address fetch error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // POST: Save customer default address
  if (req.method === 'POST') {
    const { uid, address } = req.body;
    if (!uid || !address) {
      return res.status(400).json({ error: 'Missing uid or address data' });
    }

    const payload = {
      ...address,
      updatedAt: new Date().toISOString()
    };

    if (!db) {
      return res.status(200).json({ success: true, address: payload, isSimulated: true });
    }

    try {
      await db.collection('users').doc(uid).collection('addresses').doc('default').set(payload, { merge: true });
      return res.status(200).json({ success: true, address: payload });
    } catch (err) {
      console.error('Firestore address save error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
