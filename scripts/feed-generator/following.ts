import { QueryParams } from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import { AppContext } from '../config'

// max 15 chars
export const shortname = 'following'

const BSKY_API = 'https://public.api.bsky.app'

// Cache for user following list (expires after 5 minutes)
const followingCache = new Map<string, { dids: Set<string>; expires: number }>()

// Extract DID from AT URI: at://did:plc:xxx/app.bsky.feed.post/rkey
function getAuthorFromUri(uri: string): string {
  const match = uri.match(/^at:\/\/(did:[^/]+)\//)
  return match ? match[1] : ''
}

async function getFollowingDids(viewerDid: string): Promise<Set<string>> {
  // Check cache
  const cached = followingCache.get(viewerDid)
  if (cached && cached.expires > Date.now()) {
    return cached.dids
  }

  const followingDids = new Set<string>()
  let cursor: string | undefined

  try {
    // Fetch all following (paginated)
    do {
      const params = new URLSearchParams({
        actor: viewerDid,
        limit: '100',
      })
      if (cursor) params.set('cursor', cursor)

      const response = await fetch(
        `${BSKY_API}/xrpc/app.bsky.graph.getFollows?${params}`
      )

      if (!response.ok) break

      const data = await response.json() as {
        follows: { did: string }[]
        cursor?: string
      }

      for (const follow of data.follows) {
        followingDids.add(follow.did)
      }

      cursor = data.cursor
    } while (cursor)

    // Cache for 5 minutes
    followingCache.set(viewerDid, {
      dids: followingDids,
      expires: Date.now() + 5 * 60 * 1000,
    })

    console.log(`[Following] Loaded ${followingDids.size} follows for ${viewerDid}`)
  } catch (error) {
    console.error('[Following] Failed to fetch follows:', error)
  }

  return followingDids
}

export const handler = async (
  ctx: AppContext,
  params: QueryParams,
  viewerDid?: string
) => {
  // If no viewer, return empty feed
  if (!viewerDid) {
    return { cursor: undefined, feed: [] }
  }

  // Get viewer following list
  const followingDids = await getFollowingDids(viewerDid)

  if (followingDids.size === 0) {
    return { cursor: undefined, feed: [] }
  }

  // Get all posts, then filter by author
  // (Not ideal for large DBs but works for our size)
  let builder = ctx.db
    .selectFrom('post')
    .selectAll()
    .orderBy('indexedAt', 'desc')
    .orderBy('cid', 'desc')
    .limit(500) // Fetch more to filter

  if (params.cursor) {
    const timeStr = new Date(parseInt(params.cursor, 10)).toISOString()
    builder = builder.where('indexedAt', '<', timeStr)
  }

  const allPosts = await builder.execute()

  // Filter to only posts from followed users
  const filteredPosts = allPosts.filter(post => {
    const author = getAuthorFromUri(post.uri)
    return followingDids.has(author)
  }).slice(0, params.limit)

  const feed = filteredPosts.map((row) => ({
    post: row.uri,
  }))

  let cursor: string | undefined
  const last = filteredPosts.at(-1)
  if (last) {
    cursor = new Date(last.indexedAt).getTime().toString(10)
  }

  return {
    cursor,
    feed,
  }
}
