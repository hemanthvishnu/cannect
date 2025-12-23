# PDS-First Federation: Testing & Verification Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PDS-FIRST ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   User taps "Like"    ──────►   atproto-agent Edge Function                │
│   on Bluesky post                      │                                   │
│                                        ▼                                   │
│                              ┌─────────────────┐                           │
│                              │  cannect.space  │  (Your PDS)               │
│                              │     (PDS)       │                           │
│                              └────────┬────────┘                           │
│                                       │                                    │
│                           Creates record instantly                         │
│                                       │                                    │
│                                       ▼                                    │
│                              ┌─────────────────┐                           │
│                              │   Supabase DB   │  (Mirror/Cache)          │
│                              │   federated_at  │                           │
│                              └────────┬────────┘                           │
│                                       │                                    │
│                                       ▼                                    │
│                              ┌─────────────────┐                           │
│                              │   BGS Relay     │  (Auto-syncs from PDS)   │
│                              │ (bsky.network)  │                           │
│                              └────────┬────────┘                           │
│                                       │                                    │
│                                       ▼                                    │
│                              ┌─────────────────┐                           │
│                              │    Bluesky      │  (Target user sees       │
│                              │   AppView       │   notification)           │
│                              └─────────────────┘                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Test Scenarios

### Prerequisites
1. You must have a **federated account** (user with `did` in profiles table)
2. The **atproto-agent** edge function must be deployed (✅ verified)
3. The **migration 20251223100000** must be applied (✅ verified)

---

## TEST 1: Like a Bluesky Post

### Frontend Test
1. Open the app as a federated user
2. Navigate to a Bluesky post in the feed
3. Tap the heart icon to like

### What Should Happen (Frontend)
- ✅ Heart fills instantly (optimistic update)
- ✅ Like count increments immediately
- ✅ No loading spinner or delay

### Backend Verification (Edge Function Logs)
Check Supabase Dashboard → Edge Functions → atproto-agent → Logs:
```
[atproto-agent] Starting action: like
[atproto-agent] Session refreshed successfully (if needed)
[atproto-agent] Like created: at://did:plc:xxx/app.bsky.feed.like/xxx
```

### Database Verification
In Supabase SQL Editor:
```sql
SELECT id, user_id, subject_uri, at_uri, rkey, federated_at
FROM likes
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 5;
```

Expected: Row with `at_uri`, `rkey`, and `federated_at` populated.

### PDS Verification
```bash
curl "https://cannect.space/xrpc/com.atproto.repo.listRecords?repo=YOUR_DID&collection=app.bsky.feed.like&limit=5"
```

Expected: JSON with your like record.

---

## TEST 2: Unlike a Bluesky Post

### Frontend Test
1. Find a post you've already liked
2. Tap the heart to unlike

### What Should Happen
- ✅ Heart unfills instantly
- ✅ Like count decrements

### Backend Verification
```
[atproto-agent] Starting action: unlike
[atproto-agent] Unlike successful
```

### Database Verification
```sql
-- The like should be DELETED from the table
SELECT * FROM likes 
WHERE user_id = 'YOUR_USER_ID' 
AND subject_uri = 'at://...THE_POST_URI...';
-- Should return 0 rows
```

### PDS Verification
```bash
# The record should no longer exist
curl "https://cannect.space/xrpc/com.atproto.repo.getRecord?repo=YOUR_DID&collection=app.bsky.feed.like&rkey=RKEY_FROM_DB"
```
Expected: Error "RecordNotFound"

---

## TEST 3: Repost a Bluesky Post

### Frontend Test
1. Find a Bluesky post
2. Tap the repost icon

### What Should Happen
- ✅ Repost icon turns green instantly
- ✅ Repost count increments

### Database Verification
```sql
SELECT id, user_id, subject_uri, at_uri, rkey, federated_at
FROM reposts
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 5;
```

### PDS Verification
```bash
curl "https://cannect.space/xrpc/com.atproto.repo.listRecords?repo=YOUR_DID&collection=app.bsky.feed.repost&limit=5"
```

---

## TEST 4: Follow a Bluesky User

### Frontend Test
1. Navigate to a Bluesky user's profile
2. Tap "Follow"

### What Should Happen
- ✅ Button changes to "Following" instantly
- ✅ Their profile may show in your following list

### Database Verification
```sql
SELECT follower_id, subject_did, at_uri, rkey, federated_at
FROM follows
WHERE follower_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 5;
```

### PDS Verification
```bash
curl "https://cannect.space/xrpc/com.atproto.repo.listRecords?repo=YOUR_DID&collection=app.bsky.graph.follow&limit=5"
```

### Bluesky Verification
- Log into bsky.app with a test account
- Check if the followed user shows in your "Following" list
- This confirms the relay synced your follow

---

## TEST 5: Reply to a Bluesky Post

### Frontend Test
1. Open a Bluesky post
2. Compose and send a reply

### What Should Happen
- ✅ Reply appears in the thread
- ✅ The Bluesky author gets a notification

### Database Verification
```sql
SELECT id, user_id, content, at_uri, thread_parent_uri, federated_at
FROM posts
WHERE user_id = 'YOUR_USER_ID' 
AND thread_parent_uri IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

### PDS Verification
```bash
curl "https://cannect.space/xrpc/com.atproto.repo.listRecords?repo=YOUR_DID&collection=app.bsky.feed.post&limit=5"
```

---

## TEST 6: Like a LOCAL Cannect Post (from federated user)

### Frontend Test
1. Find a post by another Cannect user (who is also federated)
2. Tap like

### What Should Happen
- ✅ Like goes to PDS (if post has at_uri)
- ✅ Database mirror created
- ✅ The other Cannect user sees the like

### Database Verification
```sql
-- Check the like was created with federation info
SELECT l.*, p.at_uri as post_at_uri
FROM likes l
JOIN posts p ON l.post_id = p.id
WHERE l.user_id = 'YOUR_USER_ID'
ORDER BY l.created_at DESC
LIMIT 5;
```

---

## Troubleshooting

### "Session not found"
- Check `pds_sessions` table has a row for your user
- The user may need to re-authenticate with the PDS

### "Token refresh failed"
- The refresh token may be expired
- User needs to re-login and create a new PDS session

### "PDS request failed"
1. Check if cannect.space is reachable
2. Check the edge function logs for specific error
3. Verify the DID and handle are correct

### Like/repost not showing on Bluesky
1. Check the relay status (bsky.network)
2. Verify your PDS is connected to the relay
3. Check if the record was actually created on PDS

---

## Quick SQL Queries for Verification

### Find your user info
```sql
SELECT id, username, did, handle, pds_registered
FROM profiles
WHERE username = 'YOUR_USERNAME';
```

### Check PDS session status
```sql
SELECT user_id, did, handle, updated_at
FROM pds_sessions
WHERE user_id = 'YOUR_USER_ID';
```

### Count federated interactions
```sql
SELECT 
  (SELECT COUNT(*) FROM likes WHERE user_id = 'YOUR_USER_ID' AND federated_at IS NOT NULL) as federated_likes,
  (SELECT COUNT(*) FROM reposts WHERE user_id = 'YOUR_USER_ID' AND federated_at IS NOT NULL) as federated_reposts,
  (SELECT COUNT(*) FROM follows WHERE follower_id = 'YOUR_USER_ID' AND federated_at IS NOT NULL) as federated_follows;
```

### Recent edge function activity
Check Supabase Dashboard → Edge Functions → atproto-agent → Logs

---

## Files Modified for PDS-First

| File | Changes |
|------|---------|
| `supabase/functions/atproto-agent/index.ts` | NEW - Central edge function for all interactions |
| `lib/services/atproto-agent.ts` | NEW - Client wrapper for calling edge function |
| `lib/hooks/use-posts.ts` | Modified - Hooks use PDS-first for federated users |
| `lib/hooks/use-profile.ts` | Modified - Follow/unfollow use PDS-first |
| `migrations/20251223100000_*.sql` | NEW - Removed triggers, added federation columns |
