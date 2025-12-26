/**
 * Publish the "following" feed generator record
 * 
 * This registers the feed so users can subscribe to it.
 * Run with: npx ts-node scripts/publish-following-feed.ts
 */

import { BskyAgent } from '@atproto/api';

const FEED_GENERATOR_HOSTNAME = 'feed.cannect.space';
const PUBLISHER_DID = 'did:plc:ubkp6dfvxif7rmexyat5np6e';

async function main() {
  // Get credentials from command line or environment
  const handle = process.env.BSKY_HANDLE || process.argv[2];
  const password = process.env.BSKY_PASSWORD || process.argv[3];

  if (!handle || !password) {
    console.error('Usage: npx ts-node scripts/publish-following-feed.ts <handle> <password>');
    console.error('Or set BSKY_HANDLE and BSKY_PASSWORD environment variables');
    process.exit(1);
  }

  console.log(`Logging in as ${handle}...`);
  
  const agent = new BskyAgent({ service: 'https://cannect.space' });
  await agent.login({ identifier: handle, password });
  
  console.log('Logged in successfully');

  // Check if the user's DID matches the publisher DID
  if (agent.session?.did !== PUBLISHER_DID) {
    console.error(`Warning: Your DID (${agent.session?.did}) doesn't match publisher DID (${PUBLISHER_DID})`);
    console.error('Only the publisher can create feed generator records.');
    process.exit(1);
  }

  // The feed generator record
  const record = {
    repo: agent.session.did,
    collection: 'app.bsky.feed.generator',
    rkey: 'following',
    record: {
      did: `did:web:${FEED_GENERATOR_HOSTNAME}`,
      displayName: 'Following',
      description: 'Posts from people you follow on Cannect. Includes migrated posts from the original platform.',
      createdAt: new Date().toISOString(),
    },
  };

  console.log('Creating feed generator record...');
  console.log('Record:', JSON.stringify(record, null, 2));

  try {
    const result = await agent.com.atproto.repo.putRecord(record);
    console.log('Feed generator published successfully!');
    console.log('URI:', result.data.uri);
    console.log('\nFeed can now be accessed at:');
    console.log(`at://${PUBLISHER_DID}/app.bsky.feed.generator/following`);
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log('Feed generator already exists, updating...');
      const result = await agent.com.atproto.repo.putRecord(record);
      console.log('Updated successfully!');
      console.log('URI:', result.data.uri);
    } else {
      console.error('Failed to publish:', error.message || error);
      process.exit(1);
    }
  }
}

main().catch(console.error);
