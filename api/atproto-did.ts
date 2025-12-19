import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  // Get the host header to determine which user's DID to serve
  const host = request.headers.get('host') || '';
  
  // Extract username from subdomain (e.g., "hemanth.cannect.nexus" -> "hemanth")
  const parts = host.split('.');
  
  // Handle both subdomain and root domain requests
  let username: string | null = null;
  
  if (parts.length >= 3 && parts[1] === 'cannect' && parts[2] === 'nexus') {
    // Subdomain request: hemanth.cannect.nexus
    username = parts[0];
  } else if (host === 'cannect.nexus' || host === 'www.cannect.nexus') {
    // Root domain - no specific user
    return new Response('No user specified. Use username.cannect.nexus', { 
      status: 400,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
  
  if (!username) {
    return new Response('Invalid host', { 
      status: 400,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
  
  // Query Supabase for user's DID
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('bsky_did')
    .eq('username', username)
    .single();
  
  if (error || !profile?.bsky_did) {
    return new Response(`User not found or no DID linked: ${username}`, { 
      status: 404,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
  
  // Return the DID as plain text (ATProto specification)
  return new Response(profile.bsky_did, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  });
}
