/**
 * Bluesky API Types
 * 
 * Types for interacting with Bluesky/AT Protocol data.
 * These are used as intermediate types when converting API responses
 * to our internal UnifiedPost format.
 */

/**
 * Post data structure from Bluesky API
 * Used as input to fromBlueskyPost() adapter
 */
export interface BlueskyPostData {
  uri: string;      // AT Protocol URI (at://did:plc:xxx/app.bsky.feed.post/rkey)
  cid: string;      // Content ID (hash)
  content: string;
  createdAt: string;
  author: {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
  };
  likeCount?: number;
  repostCount?: number;
  replyCount?: number;
  images?: string[];
  // Quoted post for quote posts
  quotedPost?: {
    uri: string;
    cid: string;
    content: string;
    author: {
      did: string;
      handle: string;
      displayName: string;
      avatar?: string;
    };
  };
}
