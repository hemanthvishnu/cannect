/**
 * Cannect Web Push Server
 * Handles push subscriptions and sends notifications
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const webpush = require('web-push');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'push.db');

// VAPID setup
webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:hello@cannect.space',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Database
let db;

async function initDb() {
  const SQL = await initSqlJs();
  
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  
  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_did TEXT NOT NULL,
      endpoint TEXT UNIQUE NOT NULL,
      keys_p256dh TEXT NOT NULL,
      keys_auth TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_user_did ON subscriptions(user_did)`);
  
  saveDb();
  console.log('[DB] Initialized');
}

function saveDb() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get VAPID public key
app.get('/api/push/vapid-key', (req, res) => {
  console.log('[VAPID] Key requested');
  res.json({
    publicKey: process.env.VAPID_PUBLIC_KEY,
    enabled: true
  });
});

// Subscribe to push
app.post('/api/push/subscribe', (req, res) => {
  console.log('[Subscribe] Request body:', JSON.stringify(req.body));
  try {
    const { userDid, subscription } = req.body;
    
    if (!userDid || !subscription?.endpoint || !subscription?.keys) {
      console.log('[Subscribe] Missing fields:', { userDid: !!userDid, endpoint: !!subscription?.endpoint, keys: !!subscription?.keys });
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Upsert subscription
    db.run(`
      INSERT OR REPLACE INTO subscriptions (user_did, endpoint, keys_p256dh, keys_auth)
      VALUES (?, ?, ?, ?)
    `, [userDid, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]);
    
    saveDb();
    console.log(`[Push] Subscribed: ${userDid}`);
    res.json({ success: true });
  } catch (err) {
    console.error('[Push] Subscribe error:', err);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

// Unsubscribe
app.delete('/api/push/unsubscribe', (req, res) => {
  try {
    const { endpoint } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({ error: 'Missing endpoint' });
    }
    
    db.run('DELETE FROM subscriptions WHERE endpoint = ?', [endpoint]);
    saveDb();
    console.log('[Push] Unsubscribed');
    res.json({ success: true });
  } catch (err) {
    console.error('[Push] Unsubscribe error:', err);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

// Send push to user (internal API)
app.post('/api/push/send', async (req, res) => {
  try {
    const { userDid, title, body, url, icon } = req.body;
    
    if (!userDid || !title) {
      return res.status(400).json({ error: 'Missing userDid or title' });
    }
    
    const rows = db.exec('SELECT endpoint, keys_p256dh, keys_auth FROM subscriptions WHERE user_did = ?', [userDid]);
    
    if (!rows.length || !rows[0].values.length) {
      return res.json({ sent: 0, message: 'No subscriptions found' });
    }
    
    const payload = JSON.stringify({
      title,
      body: body || '',
      url: url || 'https://cannect.space',
      icon: icon || '/icon-192.png'
    });
    
    let sent = 0;
    let failed = 0;
    
    for (const [endpoint, p256dh, auth] of rows[0].values) {
      try {
        await webpush.sendNotification({
          endpoint,
          keys: { p256dh, auth }
        }, payload);
        sent++;
      } catch (err) {
        failed++;
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription expired, remove it
          db.run('DELETE FROM subscriptions WHERE endpoint = ?', [endpoint]);
          saveDb();
        }
      }
    }
    
    console.log(`[Push] Sent to ${userDid}: ${sent} success, ${failed} failed`);
    res.json({ sent, failed });
  } catch (err) {
    console.error('[Push] Send error:', err);
    res.status(500).json({ error: 'Failed to send' });
  }
});

// Stats
app.get('/api/push/stats', (req, res) => {
  try {
    const totalResult = db.exec('SELECT COUNT(*) FROM subscriptions');
    const usersResult = db.exec('SELECT COUNT(DISTINCT user_did) FROM subscriptions');
    
    res.json({
      totalSubscriptions: totalResult[0]?.values[0]?.[0] || 0,
      uniqueUsers: usersResult[0]?.values[0]?.[0] || 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Start server
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`[Server] Cannect Push running on port ${PORT}`);
  });
}).catch(err => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});
