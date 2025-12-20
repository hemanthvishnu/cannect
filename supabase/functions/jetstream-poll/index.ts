import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Jetstream Polling Edge Function
 * 
 * Polls Bluesky's Jetstream for events relevant to Cannect users.
 * Processes likes, reposts, replies, quotes, and follows on Cannect content.
 * Updates engagement counts and creates notifications for external interactions.
 * 
 * Runs every 30 seconds via pg_cron.
 */

// Configuration
const JETSTREAM_URL = "https://jetstream2.us-east.bsky.network";
const CANNECT_DOMAIN = "cannect.space";
const PROFILE_CACHE_TTL_MS = 3600000; // 1 hour
const BSKY_PUBLIC_API = "https://public.api.bsky.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Supabase client
function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = getSupabase();
  const startTime = Date.now();

  try {
    console.log("[jetstream-poll] Starting poll...");

    // 1. Get current cursor
    const { data: cursorData, error: cursorError } = await supabase
      .from("jetstream_cursor")
      .select("cursor_time_us")
      .eq("id", 1)
      .single();

    if (cursorError) {
      throw new Error(`Cursor fetch failed: ${cursorError.message}`);
    }

    const cursor = cursorData?.cursor_time_us || (Date.now() * 1000);
    console.log(`[jetstream-poll] Starting from cursor: ${cursor}`);

    // 2. Fetch events from Jetstream using REST API
    // Note: We use the subscribe endpoint with a short timeout
    const collections = [
      "app.bsky.feed.like",
      "app.bsky.feed.repost",
      "app.bsky.feed.post",
      "app.bsky.graph.follow",
    ];

    const jetstreamUrl = new URL(`${JETSTREAM_URL}/subscribe`);
    jetstreamUrl.searchParams.set("cursor", cursor.toString());
    collections.forEach(c => jetstreamUrl.searchParams.append("wantedCollections", c));

    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    let events: any[] = [];
    
    try {
      const response = await fetch(jetstreamUrl.toString(), {
        headers: { "Accept": "text/event-stream" },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Jetstream error: ${response.status} ${response.statusText}`);
      }

      // Parse SSE events
      const text = await response.text();
      events = parseSSEEvents(text);

    } catch (fetchError: any) {
      if (fetchError.name === 'AbortError') {
        console.log("[jetstream-poll] Request timed out (normal for SSE)");
      } else {
        throw fetchError;
      }
    }

    console.log(`[jetstream-poll] Received ${events.length} events`);

    // 3. Process relevant events
    let processedCount = 0;
    let latestCursor = cursor;

    for (const event of events) {
      try {
        // Update cursor to latest event time
        if (event.time_us && event.time_us > latestCursor) {
          latestCursor = event.time_us;
        }

        // Check if event is relevant to Cannect
        if (!isRelevantToCannect(event)) continue;

        // Process the event
        await processEvent(supabase, event);
        processedCount++;

      } catch (eventError) {
        console.error(`[jetstream-poll] Error processing event:`, eventError);
        // Continue processing other events
      }
    }

    // 4. Update cursor
    await supabase
      .from("jetstream_cursor")
      .update({
        cursor_time_us: latestCursor,
        events_processed: processedCount,
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    const duration = Date.now() - startTime;
    console.log(`[jetstream-poll] Completed: ${processedCount} processed in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        eventsReceived: events.length,
        eventsProcessed: processedCount,
        cursor: latestCursor,
        durationMs: duration,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[jetstream-poll] Error:", error);

    // Log error to cursor table
    await supabase
      .from("jetstream_cursor")
      .update({
        last_error: String(error),
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============================================================================
// SSE PARSING
// ============================================================================

function parseSSEEvents(text: string): any[] {
  const events: any[] = [];
  const lines = text.split("\n");
  
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      try {
        const parsed = JSON.parse(line.slice(6));
        events.push(parsed);
      } catch {
        // Skip malformed JSON
      }
    }
  }
  
  return events;
}

// ============================================================================
// RELEVANCE CHECK
// ============================================================================

function isRelevantToCannect(event: any): boolean {
  if (event.kind !== "commit" || !event.commit) return false;

  const record = event.commit.record;
  if (!record) return false;

  // Check subject URI (for likes/reposts)
  const subjectUri = record.subject?.uri;
  if (subjectUri?.includes(CANNECT_DOMAIN)) return true;

  // Check reply URIs (for replies)
  if (record.reply?.parent?.uri?.includes(CANNECT_DOMAIN)) return true;
  if (record.reply?.root?.uri?.includes(CANNECT_DOMAIN)) return true;

  // Check embed URI (for quotes)
  if (record.embed?.record?.uri?.includes(CANNECT_DOMAIN)) return true;

  // Check follow subject (for follows of Cannect users)
  // This requires looking up the DID to see if it's a Cannect user
  // We'll handle this in processEvent
  if (event.commit.collection === "app.bsky.graph.follow") {
    return true; // Check in handler
  }

  return false;
}

// ============================================================================
// EVENT PROCESSING
// ============================================================================

async function processEvent(supabase: any, event: any) {
  const { commit, did: actorDid } = event;
  if (!commit) return;

  const { operation, collection, record, rkey } = commit;

  console.log(`[jetstream-poll] Processing ${operation} on ${collection} by ${actorDid}`);

  switch (collection) {
    case "app.bsky.feed.like":
      await handleLikeEvent(supabase, actorDid, operation, record, rkey);
      break;
    case "app.bsky.feed.repost":
      await handleRepostEvent(supabase, actorDid, operation, record, rkey);
      break;
    case "app.bsky.feed.post":
      await handlePostEvent(supabase, actorDid, operation, record, rkey);
      break;
    case "app.bsky.graph.follow":
      await handleFollowEvent(supabase, actorDid, operation, record, rkey);
      break;
  }
}

// ============================================================================
// LIKE EVENTS
// ============================================================================

async function handleLikeEvent(
  supabase: any,
  actorDid: string,
  operation: string,
  record: any,
  rkey: string
) {
  const subjectUri = record?.subject?.uri;
  if (!subjectUri || !subjectUri.includes(CANNECT_DOMAIN)) return;

  // Find the Cannect post
  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, user_id")
    .eq("at_uri", subjectUri)
    .single();

  if (postError || !post) {
    console.log(`[jetstream-poll] Post not found for URI: ${subjectUri}`);
    return;
  }

  const interactionUri = `at://${actorDid}/app.bsky.feed.like/${rkey}`;

  if (operation === "create") {
    // Check if already processed (idempotency)
    const { data: existing } = await supabase
      .from("federated_interactions")
      .select("id")
      .eq("at_uri", interactionUri)
      .maybeSingle();

    if (existing) {
      console.log(`[jetstream-poll] Like already processed: ${interactionUri}`);
      return;
    }

    // Store the interaction
    const { error: insertError } = await supabase
      .from("federated_interactions")
      .insert({
        post_id: post.id,
        interaction_type: "like",
        actor_did: actorDid,
        at_uri: interactionUri,
      });

    if (insertError) {
      console.error(`[jetstream-poll] Failed to insert like:`, insertError);
      return;
    }

    // Increment count
    await supabase.rpc("increment_post_likes", { target_post_id: post.id });

    // Create notification
    await createExternalNotification(supabase, post.user_id, actorDid, "like", post.id);

    console.log(`[jetstream-poll] ✅ Processed like from ${actorDid} on post ${post.id}`);

  } else if (operation === "delete") {
    // Remove the interaction
    const { error: deleteError } = await supabase
      .from("federated_interactions")
      .delete()
      .eq("at_uri", interactionUri);

    if (!deleteError) {
      // Decrement count
      await supabase.rpc("decrement_post_likes", { target_post_id: post.id });
      console.log(`[jetstream-poll] ✅ Processed unlike from ${actorDid} on post ${post.id}`);
    }
  }
}

// ============================================================================
// REPOST EVENTS
// ============================================================================

async function handleRepostEvent(
  supabase: any,
  actorDid: string,
  operation: string,
  record: any,
  rkey: string
) {
  const subjectUri = record?.subject?.uri;
  if (!subjectUri || !subjectUri.includes(CANNECT_DOMAIN)) return;

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, user_id")
    .eq("at_uri", subjectUri)
    .single();

  if (postError || !post) return;

  const interactionUri = `at://${actorDid}/app.bsky.feed.repost/${rkey}`;

  if (operation === "create") {
    const { data: existing } = await supabase
      .from("federated_interactions")
      .select("id")
      .eq("at_uri", interactionUri)
      .maybeSingle();

    if (existing) return;

    const { error: insertError } = await supabase
      .from("federated_interactions")
      .insert({
        post_id: post.id,
        interaction_type: "repost",
        actor_did: actorDid,
        at_uri: interactionUri,
      });

    if (!insertError) {
      await supabase.rpc("increment_post_reposts", { target_post_id: post.id });
      await createExternalNotification(supabase, post.user_id, actorDid, "repost", post.id);
      console.log(`[jetstream-poll] ✅ Processed repost from ${actorDid} on post ${post.id}`);
    }

  } else if (operation === "delete") {
    const { error: deleteError } = await supabase
      .from("federated_interactions")
      .delete()
      .eq("at_uri", interactionUri);

    if (!deleteError) {
      await supabase.rpc("decrement_post_reposts", { target_post_id: post.id });
      console.log(`[jetstream-poll] ✅ Processed unrepost from ${actorDid} on post ${post.id}`);
    }
  }
}

// ============================================================================
// POST EVENTS (REPLIES & QUOTES)
// ============================================================================

async function handlePostEvent(
  supabase: any,
  actorDid: string,
  operation: string,
  record: any,
  rkey: string
) {
  // Only process creates (not updates/deletes for now)
  if (operation !== "create") return;

  const interactionUri = `at://${actorDid}/app.bsky.feed.post/${rkey}`;

  // Check for reply to Cannect post
  const parentUri = record?.reply?.parent?.uri;
  if (parentUri?.includes(CANNECT_DOMAIN)) {
    const { data: parentPost } = await supabase
      .from("posts")
      .select("id, user_id")
      .eq("at_uri", parentUri)
      .single();

    if (parentPost) {
      const { data: existing } = await supabase
        .from("federated_interactions")
        .select("id")
        .eq("at_uri", interactionUri)
        .maybeSingle();

      if (!existing) {
        const { error: insertError } = await supabase
          .from("federated_interactions")
          .insert({
            post_id: parentPost.id,
            interaction_type: "reply",
            actor_did: actorDid,
            at_uri: interactionUri,
            metadata: {
              text: record.text?.substring(0, 500), // Truncate for storage
              createdAt: record.createdAt,
            },
          });

        if (!insertError) {
          await supabase.rpc("increment_post_replies", { target_post_id: parentPost.id });
          await createExternalNotification(supabase, parentPost.user_id, actorDid, "reply", parentPost.id);
          console.log(`[jetstream-poll] ✅ Processed reply from ${actorDid} on post ${parentPost.id}`);
        }
      }
    }
  }

  // Check for quote of Cannect post
  const quotedUri = record?.embed?.record?.uri;
  if (quotedUri?.includes(CANNECT_DOMAIN)) {
    const { data: quotedPost } = await supabase
      .from("posts")
      .select("id, user_id")
      .eq("at_uri", quotedUri)
      .single();

    if (quotedPost) {
      // Use a different URI pattern to distinguish quote from reply
      const quoteInteractionUri = `${interactionUri}#quote`;

      const { data: existing } = await supabase
        .from("federated_interactions")
        .select("id")
        .eq("at_uri", quoteInteractionUri)
        .maybeSingle();

      if (!existing) {
        const { error: insertError } = await supabase
          .from("federated_interactions")
          .insert({
            post_id: quotedPost.id,
            interaction_type: "quote",
            actor_did: actorDid,
            at_uri: quoteInteractionUri,
            metadata: {
              text: record.text?.substring(0, 500),
              createdAt: record.createdAt,
            },
          });

        if (!insertError) {
          await supabase.rpc("increment_post_quotes", { target_post_id: quotedPost.id });
          await createExternalNotification(supabase, quotedPost.user_id, actorDid, "quote", quotedPost.id);
          console.log(`[jetstream-poll] ✅ Processed quote from ${actorDid} on post ${quotedPost.id}`);
        }
      }
    }
  }
}

// ============================================================================
// FOLLOW EVENTS
// ============================================================================

async function handleFollowEvent(
  supabase: any,
  actorDid: string,
  operation: string,
  record: any,
  rkey: string
) {
  const subjectDid = record?.subject;
  if (!subjectDid) return;

  // Find the Cannect user being followed
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("did", subjectDid)
    .single();

  // If not found, the followed user is not a Cannect user
  if (profileError || !profile) return;

  const interactionUri = `at://${actorDid}/app.bsky.graph.follow/${rkey}`;

  if (operation === "create") {
    const { data: existing } = await supabase
      .from("federated_interactions")
      .select("id")
      .eq("at_uri", interactionUri)
      .maybeSingle();

    if (existing) return;

    const { error: insertError } = await supabase
      .from("federated_interactions")
      .insert({
        target_user_id: profile.id,
        interaction_type: "follow",
        actor_did: actorDid,
        at_uri: interactionUri,
      });

    if (!insertError) {
      await supabase.rpc("increment_profile_followers", { target_profile_id: profile.id });
      await createExternalNotification(supabase, profile.id, actorDid, "follow", null);
      console.log(`[jetstream-poll] ✅ Processed follow from ${actorDid} on user ${profile.id}`);
    }

  } else if (operation === "delete") {
    const { error: deleteError } = await supabase
      .from("federated_interactions")
      .delete()
      .eq("at_uri", interactionUri);

    if (!deleteError) {
      await supabase.rpc("decrement_profile_followers", { target_profile_id: profile.id });
      console.log(`[jetstream-poll] ✅ Processed unfollow from ${actorDid} on user ${profile.id}`);
    }
  }
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

async function createExternalNotification(
  supabase: any,
  userId: string,
  actorDid: string,
  reason: string,
  postId: string | null
) {
  // Get actor profile (with caching)
  const actor = await getBlueskyProfile(supabase, actorDid);

  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    actor_id: null, // External actor, no local ID
    actor_did: actorDid,
    actor_handle: actor?.handle || actorDid.slice(0, 20),
    actor_display_name: actor?.displayName,
    actor_avatar: actor?.avatar,
    reason: reason,
    post_id: postId,
    is_external: true,
  });

  if (error) {
    console.error(`[jetstream-poll] Failed to create notification:`, error);
  }
}

async function getBlueskyProfile(supabase: any, did: string) {
  // Check cache first
  const { data: cached } = await supabase
    .from("bluesky_profile_cache")
    .select("*")
    .eq("did", did)
    .maybeSingle();

  if (cached) {
    const cacheAge = Date.now() - new Date(cached.cached_at).getTime();
    if (cacheAge < PROFILE_CACHE_TTL_MS) {
      return cached;
    }
  }

  // Fetch from Bluesky public API
  try {
    const response = await fetch(
      `${BSKY_PUBLIC_API}/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`
    );

    if (!response.ok) {
      console.warn(`[jetstream-poll] Failed to fetch Bluesky profile for ${did}: ${response.status}`);
      return null;
    }

    const profile = await response.json();

    // Update cache
    await supabase.from("bluesky_profile_cache").upsert({
      did: did,
      handle: profile.handle,
      display_name: profile.displayName,
      avatar: profile.avatar,
      cached_at: new Date().toISOString(),
    });

    return profile;

  } catch (error) {
    console.error(`[jetstream-poll] Error fetching Bluesky profile for ${did}:`, error);
    return null;
  }
}
