import webpush from 'web-push'
import { AppViewDb } from './db.js'

// VAPID keys for Web Push
// Generate with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:hello@cannect.app'

// Configure web-push
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  console.log('[Push] VAPID configured')
} else {
  console.warn('[Push] VAPID keys not configured - push notifications disabled')
}

export interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: Record<string, unknown>
}

/**
 * Send push notification to a specific user
 */
export async function sendPushToUser(
  db: AppViewDb,
  userDid: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.log('[Push] Skipping - VAPID not configured')
    return { sent: 0, failed: 0 }
  }

  // Get all subscriptions for this user
  const subscriptions = db.prepare(`
    SELECT id, endpoint, p256dh, auth 
    FROM push_subscriptions 
    WHERE user_did = ?
  `).all(userDid) as Array<{ id: number; endpoint: string; p256dh: string; auth: string }>

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 }
  }

  console.log(`[Push] Sending to ${subscriptions.length} subscription(s) for ${userDid.slice(0, 20)}...`)

  let sent = 0
  let failed = 0

  for (const sub of subscriptions) {
    const pushSubscription: PushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    }

    try {
      await webpush.sendNotification(
        pushSubscription as webpush.PushSubscription,
        JSON.stringify(payload),
        {
          TTL: 60 * 60 * 24, // 24 hours
          urgency: 'normal',
        }
      )

      // Update last_used_at
      db.prepare('UPDATE push_subscriptions SET last_used_at = datetime("now") WHERE id = ?').run(sub.id)
      sent++

    } catch (error: any) {
      console.error(`[Push] Failed to send to ${sub.endpoint.slice(0, 50)}...`, error.statusCode || error.message)
      
      // Remove invalid subscriptions (410 Gone, 404 Not Found)
      if (error.statusCode === 410 || error.statusCode === 404) {
        console.log(`[Push] Removing expired subscription ${sub.id}`)
        db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(sub.id)
      }
      
      failed++
    }
  }

  console.log(`[Push] Sent ${sent}, failed ${failed}`)
  return { sent, failed }
}

/**
 * Subscribe a user to push notifications
 */
export function saveSubscription(
  db: AppViewDb,
  userDid: string,
  subscription: PushSubscription,
  userAgent?: string
): boolean {
  try {
    db.prepare(`
      INSERT INTO push_subscriptions (user_did, endpoint, p256dh, auth, user_agent)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(endpoint) DO UPDATE SET
        user_did = excluded.user_did,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent
    `).run(userDid, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, userAgent || null)
    
    console.log(`[Push] Saved subscription for ${userDid.slice(0, 20)}...`)
    return true
  } catch (error) {
    console.error('[Push] Failed to save subscription:', error)
    return false
  }
}

/**
 * Remove a subscription
 */
export function removeSubscription(db: AppViewDb, endpoint: string): boolean {
  try {
    const result = db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint)
    console.log(`[Push] Removed subscription: ${result.changes > 0}`)
    return result.changes > 0
  } catch (error) {
    console.error('[Push] Failed to remove subscription:', error)
    return false
  }
}

/**
 * Get VAPID public key (for client subscription)
 */
export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY
}

/**
 * Check if push is enabled
 */
export function isPushEnabled(): boolean {
  return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY)
}
