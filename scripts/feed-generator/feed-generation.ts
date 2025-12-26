import { InvalidRequestError, AuthRequiredError } from '@atproto/xrpc-server'
import { Server } from '../lexicon'
import { AppContext } from '../config'
import algos from '../algos'
import { validateAuth } from '../auth'
import { AtUri } from '@atproto/syntax'

// Only allow users from cannect.space PDS
async function verifyCannectUser(
  req: any,
  ctx: AppContext
): Promise<string> {
  const requesterDid = await validateAuth(
    req,
    ctx.cfg.serviceDid,
    ctx.didResolver,
  )

  // Resolve the DID to get the handle
  const didDoc = await ctx.didResolver.resolve(requesterDid)
  if (!didDoc) {
    throw new AuthRequiredError('Could not resolve DID')
  }

  // Get the handle from alsoKnownAs
  const handle = didDoc.alsoKnownAs?.find(aka => aka.startsWith('at://'))?.replace('at://', '')

  // Check if handle ends with .cannect.space
  if (!handle || !handle.endsWith('.cannect.space')) {
    throw new InvalidRequestError(
      'This feed is exclusive to Cannect users. Join cannect.space to access.',
      'CannectUsersOnly',
    )
  }

  return requesterDid
}

export default function (server: Server, ctx: AppContext) {
  server.app.bsky.feed.getFeedSkeleton(async ({ params, req }) => {
    const feedUri = new AtUri(params.feed)
    const algo = algos[feedUri.rkey]
    if (
      feedUri.hostname !== ctx.cfg.publisherDid ||
      feedUri.collection !== 'app.bsky.feed.generator' ||
      !algo
    ) {
      throw new InvalidRequestError(
        'Unsupported algorithm',
        'UnsupportedAlgorithm',
      )
    }

    // Verify user is from cannect.space and get their DID
    const viewerDid = await verifyCannectUser(req, ctx)

    // Pass viewerDid to algorithm (needed for following feed)
    const body = await algo(ctx, params, viewerDid)
    return {
      encoding: 'application/json',
      body: body,
    }
  })
}
