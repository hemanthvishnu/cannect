/**
 * Bluesky Federation Service
 * Fetches public posts from Bluesky without authentication.
 * Maps them to our internal PostWithAuthor format.
 */

export async function getFederatedPosts(limit = 25) {
  try {
    // searchPosts with q=* pulls the most recent public posts globally
    const response = await fetch(
      `https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=*&sort=latest&limit=${limit}`
    );
    
    if (!response.ok) {
      throw new Error(`Bluesky API error: ${response.status}`);
    }
    
    const data = await response.json();

    return data.posts.map((bskyPost: any) => ({
      id: bskyPost.cid,
      user_id: bskyPost.author.did,
      content: bskyPost.record.text,
      created_at: bskyPost.record.createdAt,
      media_urls: bskyPost.embed?.images?.map((img: any) => img.fullsize) || [],
      likes_count: bskyPost.likeCount || 0,
      reposts_count: bskyPost.repostCount || 0,
      comments_count: bskyPost.replyCount || 0,
      is_federated: true, // Internal flag for UI logic
      type: 'post',
      author: {
        id: bskyPost.author.did,
        username: bskyPost.author.handle,
        display_name: bskyPost.author.displayName || bskyPost.author.handle,
        avatar_url: bskyPost.author.avatar,
        is_verified: false,
      },
    }));
  } catch (error) {
    console.error("Bluesky fetch failed:", error);
    return [];
  }
}

/**
 * Search Bluesky posts by query
 */
export async function searchFederatedPosts(query: string, limit = 25) {
  try {
    const response = await fetch(
      `https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(query)}&sort=latest&limit=${limit}`
    );
    
    if (!response.ok) {
      throw new Error(`Bluesky API error: ${response.status}`);
    }
    
    const data = await response.json();

    return data.posts.map((bskyPost: any) => ({
      id: bskyPost.cid,
      user_id: bskyPost.author.did,
      content: bskyPost.record.text,
      created_at: bskyPost.record.createdAt,
      media_urls: bskyPost.embed?.images?.map((img: any) => img.fullsize) || [],
      likes_count: bskyPost.likeCount || 0,
      reposts_count: bskyPost.repostCount || 0,
      comments_count: bskyPost.replyCount || 0,
      is_federated: true,
      type: 'post',
      author: {
        id: bskyPost.author.did,
        username: bskyPost.author.handle,
        display_name: bskyPost.author.displayName || bskyPost.author.handle,
        avatar_url: bskyPost.author.avatar,
        is_verified: false,
      },
    }));
  } catch (error) {
    console.error("Bluesky search failed:", error);
    return [];
  }
}
