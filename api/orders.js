/**
 * Vercel Serverless Function: /api/orders
 * Manages customer order history and tracking in Cloud Firestore via Firebase Admin SDK.
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

  // GET: Fetch orders for a customer by UID or Order Number
  if (req.method === 'GET') {
    const { uid, orderNumber } = req.query;

    if (!uid && !orderNumber) {
      return res.status(400).json({ error: 'Missing uid or orderNumber parameter' });
    }

    if (!db) {
      return res.status(200).json({ orders: [] });
    }

    try {
      if (uid) {
        const snapshot = await db.collection('users').doc(uid).collection('orders').orderBy('createdAt', 'desc').get();
        const orders = [];
        snapshot.forEach(doc => orders.push({ id: doc.id, ...doc.data() }));
        return res.status(200).json({ orders });
      }

      if (orderNumber) {
        const cleanNum = orderNumber.replace('#', '');
        const snapshot = await db.collectionGroup('orders').where('orderNumber', '==', '#' + cleanNum).get();
        if (snapshot.empty) {
          return res.status(404).json({ error: 'Order not found' });
        }
        const doc = snapshot.docs[0];
        return res.status(200).json({ order: { id: doc.id, ...doc.data() } });
      }
    } catch (err) {
      console.error('Firestore get orders error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // POST: Create / store new order in Firestore
  if (req.method === 'POST') {
    const { uid, order } = req.body;
    if (!uid || !order) {
      return res.status(400).json({ error: 'Missing uid or order payload' });
    }

    const orderId = order.orderNumber || ('#AX' + Math.floor(1000 + Math.random() * 9000));
    const orderData = {
      ...order,
      orderNumber: orderId,
      createdAt: new Date().toISOString()
    };

    if (!db) {
      return res.status(200).json({ success: true, order: orderData, isSimulated: true });
    }

    try {
      await db.collection('users').doc(uid).collection('orders').doc(orderId.replace('#', '')).set(orderData);
      return res.status(201).json({ success: true, order: orderData });
    } catch (err) {
      console.error('Firestore save order error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
