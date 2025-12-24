/**
 * PDS-First Federation Test Suite
 * 
 * Run these tests in your app's console or create a test screen.
 * Each test verifies: Frontend → Edge Function → PDS → Database Mirror
 */

import { supabase } from '@/lib/supabase';
import * as atprotoAgent from '@/lib/services/atproto-agent';

// =============================================================================
// SETUP: Get your test user info
// =============================================================================
export async function getTestUserInfo() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.log('❌ Not logged in');
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, did, handle, pds_registered')
    .eq('id', user.id)
    .single();

  console.log('📋 Test User Info:');
  console.log('  User ID:', user.id);
  console.log('  Username:', profile?.username);
  console.log('  DID:', profile?.did);
  console.log('  Handle:', profile?.handle);
  console.log('  PDS Registered:', profile?.pds_registered);
  console.log('  Is Federated:', !!profile?.did);

  return { user, profile };
}

// =============================================================================
// TEST 1: Like a Bluesky Post
// =============================================================================
export async function testLikeBlueskyPost() {
  console.log('\n🧪 TEST 1: Like a Bluesky Post');
  console.log('================================');

  const { user, profile } = await getTestUserInfo() || {};
  if (!user || !profile?.did) {
    console.log('❌ User not federated');
    return false;
  }

  // Use a real Bluesky post URI and CID (you'll need to get these from the app)
  const testPost = {
    uri: 'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/3l5a4vqio4c2i', // Example
    cid: 'bafyreigxvsmbvxla4yb5j6gfnp4akqx5duzejfpkogihxmc5vu5lxnxm5q', // Example
  };

  console.log('  Target Post URI:', testPost.uri);

  try {
    // 1. Call atproto-agent
    console.log('  📤 Calling atproto-agent.likePost...');
    const result = await atprotoAgent.likePost({
      userId: user.id,
      subjectUri: testPost.uri,
      subjectCid: testPost.cid,
    });
    console.log('  ✅ PDS Response:', result);

    // 2. Verify in database
    console.log('  🔍 Checking database mirror...');
    const { data: likeRecord } = await supabase
      .from('likes')
      .select('*')
      .eq('user_id', user.id)
      .eq('subject_uri', testPost.uri)
      .single();

    if (likeRecord) {
      console.log('  ✅ Database Mirror Found:');
      console.log('    - at_uri:', likeRecord.at_uri);
      console.log('    - rkey:', likeRecord.rkey);
      console.log('    - federated_at:', likeRecord.federated_at);
      return true;
    } else {
      console.log('  ⚠️ Database mirror not found (may take a moment)');
      return false;
    }
  } catch (error: any) {
    console.log('  ❌ Error:', error.message);
    return false;
  }
}

// =============================================================================
// TEST 2: Unlike a Bluesky Post
// =============================================================================
export async function testUnlikeBlueskyPost(subjectUri: string) {
  console.log('\n🧪 TEST 2: Unlike a Bluesky Post');
  console.log('=================================');

  const { user, profile } = await getTestUserInfo() || {};
  if (!user || !profile?.did) {
    console.log('❌ User not federated');
    return false;
  }

  try {
    // 1. Call atproto-agent
    console.log('  📤 Calling atproto-agent.unlikePost...');
    await atprotoAgent.unlikePost({
      userId: user.id,
      subjectUri,
    });
    console.log('  ✅ PDS delete successful');

    // 2. Verify removed from database
    console.log('  🔍 Checking database...');
    const { data: likeRecord } = await supabase
      .from('likes')
      .select('*')
      .eq('user_id', user.id)
      .eq('subject_uri', subjectUri)
      .maybeSingle();

    if (!likeRecord) {
      console.log('  ✅ Like removed from database');
      return true;
    } else {
      console.log('  ⚠️ Like still in database');
      return false;
    }
  } catch (error: any) {
    console.log('  ❌ Error:', error.message);
    return false;
  }
}

// =============================================================================
// TEST 3: Repost a Bluesky Post
// =============================================================================
export async function testRepostBlueskyPost() {
  console.log('\n🧪 TEST 3: Repost a Bluesky Post');
  console.log('=================================');

  const { user, profile } = await getTestUserInfo() || {};
  if (!user || !profile?.did) {
    console.log('❌ User not federated');
    return false;
  }

  const testPost = {
    uri: 'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/3l5a4vqio4c2i',
    cid: 'bafyreigxvsmbvxla4yb5j6gfnp4akqx5duzejfpkogihxmc5vu5lxnxm5q',
  };

  try {
    console.log('  📤 Calling atproto-agent.repostPost...');
    const result = await atprotoAgent.repostPost({
      userId: user.id,
      subjectUri: testPost.uri,
      subjectCid: testPost.cid,
    });
    console.log('  ✅ PDS Response:', result);

    // Verify in database
    const { data: repostRecord } = await supabase
      .from('reposts')
      .select('*')
      .eq('user_id', user.id)
      .eq('subject_uri', testPost.uri)
      .single();

    if (repostRecord) {
      console.log('  ✅ Database Mirror:');
      console.log('    - at_uri:', repostRecord.at_uri);
      console.log('    - federated_at:', repostRecord.federated_at);
      return true;
    }
    return false;
  } catch (error: any) {
    console.log('  ❌ Error:', error.message);
    return false;
  }
}

// =============================================================================
// TEST 4: Follow a Bluesky User
// =============================================================================
export async function testFollowBlueskyUser() {
  console.log('\n🧪 TEST 4: Follow a Bluesky User');
  console.log('=================================');

  const { user, profile } = await getTestUserInfo() || {};
  if (!user || !profile?.did) {
    console.log('❌ User not federated');
    return false;
  }

  // Pick a Bluesky user to follow
  const targetUser = {
    did: 'did:plc:z72i7hdynmk6r22z27h6tvur', // @bsky.app
    handle: 'bsky.app',
    displayName: 'Bluesky',
  };

  try {
    console.log('  📤 Calling atproto-agent.followUser...');
    const result = await atprotoAgent.followUser({
      userId: user.id,
      targetDid: targetUser.did,
      targetHandle: targetUser.handle,
      targetDisplayName: targetUser.displayName,
    });
    console.log('  ✅ PDS Response:', result);

    // Verify in database
    const { data: followRecord } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', user.id)
      .eq('subject_did', targetUser.did)
      .single();

    if (followRecord) {
      console.log('  ✅ Database Mirror:');
      console.log('    - at_uri:', followRecord.at_uri);
      console.log('    - rkey:', followRecord.rkey);
      console.log('    - federated_at:', followRecord.federated_at);
      return true;
    }
    return false;
  } catch (error: any) {
    console.log('  ❌ Error:', error.message);
    return false;
  }
}

// =============================================================================
// TEST 5: Reply to a Bluesky Post
// =============================================================================
export async function testReplyToBlueskyPost() {
  console.log('\n🧪 TEST 5: Reply to a Bluesky Post');
  console.log('===================================');

  const { user, profile } = await getTestUserInfo() || {};
  if (!user || !profile?.did) {
    console.log('❌ User not federated');
    return false;
  }

  const parentPost = {
    uri: 'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/3l5a4vqio4c2i',
    cid: 'bafyreigxvsmbvxla4yb5j6gfnp4akqx5duzejfpkogihxmc5vu5lxnxm5q',
  };

  try {
    console.log('  📤 Calling atproto-agent.replyToPost...');
    const result = await atprotoAgent.replyToPost({
      userId: user.id,
      content: 'Test reply from Cannect! 🚀',
      parentUri: parentPost.uri,
      parentCid: parentPost.cid,
    });
    console.log('  ✅ PDS Response:', result);

    // Verify in database
    const { data: replyRecord } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', user.id)
      .eq('thread_parent_uri', parentPost.uri)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (replyRecord) {
      console.log('  ✅ Database Mirror:');
      console.log('    - at_uri:', replyRecord.at_uri);
      console.log('    - federated_at:', (replyRecord as any).federated_at);
      return true;
    }
    return false;
  } catch (error: any) {
    console.log('  ❌ Error:', error.message);
    return false;
  }
}

// =============================================================================
// TEST 6: Verify PDS Records Directly
// =============================================================================
export async function verifyPdsRecords() {
  console.log('\n🧪 TEST 6: Verify PDS Records');
  console.log('==============================');

  const { profile } = await getTestUserInfo() || {};
  if (!profile?.did) {
    console.log('❌ User not federated');
    return;
  }

  const PDS_URL = 'https://cannect.space';
  const collections = [
    'app.bsky.feed.like',
    'app.bsky.feed.repost',
    'app.bsky.graph.follow',
    'app.bsky.feed.post',
  ];

  for (const collection of collections) {
    try {
      const response = await fetch(
        `${PDS_URL}/xrpc/com.atproto.repo.listRecords?repo=${encodeURIComponent(profile.did)}&collection=${collection}&limit=5`
      );
      const data = await response.json();
      console.log(`\n  📁 ${collection}:`);
      console.log(`    Count: ${data.records?.length || 0} records`);
      if (data.records?.[0]) {
        console.log(`    Latest: ${data.records[0].uri}`);
      }
    } catch (e) {
      console.log(`  ❌ Failed to fetch ${collection}`);
    }
  }
}

// =============================================================================
// RUN ALL TESTS
// =============================================================================
export async function runAllTests() {
  console.log('🚀 PDS-First Federation Test Suite');
  console.log('====================================\n');

  const info = await getTestUserInfo();
  if (!info?.profile?.did) {
    console.log('\n❌ Cannot run tests - user is not federated');
    console.log('   Please create a federated account first.');
    return;
  }

  console.log('\n⚠️ Note: Replace test post URIs/CIDs with real ones from your app');
  console.log('   You can get these from the BlueskyPost component props\n');

  // Run tests
  await testLikeBlueskyPost();
  await testRepostBlueskyPost();
  await testFollowBlueskyUser();
  await testReplyToBlueskyPost();
  await verifyPdsRecords();

  console.log('\n====================================');
  console.log('✅ Test suite complete!');
  console.log('Check your Bluesky profile to verify federation.');
}

// =============================================================================
// VERSION 2.1 UNIFIED ARCHITECTURE TESTS
// =============================================================================

/**
 * Verify actor_did is populated on likes table
 * Version 2.1: All interactions use actor_did + subject_uri as universal key
 */
export async function testUnifiedLikeSchema() {
  console.log('\n🧪 TEST: Unified Like Schema (Version 2.1)');
  console.log('===========================================');

  const { user, profile } = await getTestUserInfo() || {};
  if (!user || !profile?.did) {
    console.log('❌ User not federated');
    return false;
  }

  try {
    // Check if likes table has actor_did column and it's populated
    const { data: likes, error } = await supabase
      .from('likes')
      .select('id, user_id, actor_did, subject_uri, at_uri')
      .eq('user_id', user.id)
      .limit(5);

    if (error) {
      console.log('  ❌ Error querying likes:', error.message);
      return false;
    }

    console.log(`  📊 Found ${likes?.length || 0} likes for user`);
    
    if (likes && likes.length > 0) {
      const withActorDid = likes.filter(l => l.actor_did);
      console.log(`  ✅ Likes with actor_did: ${withActorDid.length}/${likes.length}`);
      
      if (withActorDid.length === likes.length) {
        console.log('  ✅ All likes have actor_did populated');
        return true;
      } else {
        console.log('  ⚠️ Some likes missing actor_did');
        return false;
      }
    }
    
    console.log('  ℹ️ No likes found to verify');
    return true;
  } catch (error: any) {
    console.log('  ❌ Error:', error.message);
    return false;
  }
}

/**
 * Verify cached_posts table exists and has correct schema
 */
export async function testCachedPostsTable() {
  console.log('\n🧪 TEST: Cached Posts Table (Version 2.1)');
  console.log('==========================================');

  try {
    const { data, error } = await supabase
      .from('cached_posts')
      .select('at_uri, author_did, like_count, repost_count, reply_count')
      .limit(3);

    if (error) {
      console.log('  ❌ Error querying cached_posts:', error.message);
      console.log('  ℹ️ Table may not exist or have different column names');
      return false;
    }

    console.log(`  ✅ cached_posts table exists with ${data?.length || 0} cached posts`);
    
    if (data && data.length > 0) {
      console.log('  📊 Sample cached post:');
      console.log(`    - at_uri: ${data[0].at_uri?.substring(0, 50)}...`);
      console.log(`    - author_did: ${data[0].author_did?.substring(0, 30)}...`);
      console.log(`    - counts: ${data[0].like_count}L/${data[0].repost_count}R/${data[0].reply_count}C`);
    }
    
    return true;
  } catch (error: any) {
    console.log('  ❌ Error:', error.message);
    return false;
  }
}

/**
 * Verify cached_profiles table exists
 */
export async function testCachedProfilesTable() {
  console.log('\n🧪 TEST: Cached Profiles Table (Version 2.1)');
  console.log('=============================================');

  try {
    const { data, error } = await supabase
      .from('cached_profiles')
      .select('did, handle, display_name, followers_count, following_count')
      .limit(3);

    if (error) {
      console.log('  ❌ Error querying cached_profiles:', error.message);
      return false;
    }

    console.log(`  ✅ cached_profiles table exists with ${data?.length || 0} cached profiles`);
    
    if (data && data.length > 0) {
      console.log('  📊 Sample cached profile:');
      console.log(`    - handle: @${data[0].handle}`);
      console.log(`    - display_name: ${data[0].display_name}`);
      console.log(`    - followers: ${data[0].followers_count}`);
    }
    
    return true;
  } catch (error: any) {
    console.log('  ❌ Error:', error.message);
    return false;
  }
}

/**
 * Run all Version 2.1 architecture tests
 */
export async function runUnifiedArchitectureTests() {
  console.log('\n🏗️ Version 2.1 Unified Architecture Tests');
  console.log('==========================================\n');

  const results = {
    likeSchema: await testUnifiedLikeSchema(),
    cachedPosts: await testCachedPostsTable(),
    cachedProfiles: await testCachedProfilesTable(),
  };

  console.log('\n📋 Results Summary:');
  console.log(`  - Unified Like Schema: ${results.likeSchema ? '✅' : '❌'}`);
  console.log(`  - Cached Posts Table: ${results.cachedPosts ? '✅' : '❌'}`);
  console.log(`  - Cached Profiles Table: ${results.cachedProfiles ? '✅' : '❌'}`);

  const allPassed = Object.values(results).every(Boolean);
  console.log(`\n${allPassed ? '✅ All tests passed!' : '⚠️ Some tests failed'}`);
  
  return allPassed;
}

