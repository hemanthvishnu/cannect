import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Get the host header to determine which user's DID to serve
  const host = req.headers.host || '';
  
  // Extract username from subdomain (e.g., "hemanth.cannect.nexus" -> "hemanth")
  const parts = host.split('.');
  
  // Handle both subdomain and root domain requests
  let username: string | null = null;
  
  if (parts.length >= 3 && parts[1] === 'cannect' && parts[2].startsWith('nexus')) {
    // Subdomain request: hemanth.cannect.nexus
    username = parts[0];
  } else if (host.includes('cannect') && host.includes('vercel')) {
    // Preview deployment - check for username in query
    username = req.query.username as string || null;
  } else if (host === 'cannect.nexus' || host === 'www.cannect.nexus') {
    // Root domain - no specific user
    return res.status(400).send('No user specified. Use username.cannect.nexus');
  }
  
  if (!username) {
    // Try query param fallback
    username = req.query.username as string || null;
  }
  
  if (!username) {
    return res.status(400).send('Invalid host or missing username');
  }
  
  // Query Supabase for user's DID
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('bsky_did')
    .eq('username', username)
    .single();
  
  if (error || !profile?.bsky_did) {
    return res.status(404).send(`User not found or no DID linked: ${username}`);
  }
  
  // Return the DID as plain text (ATProto specification)
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).send(profile.bsky_did);
}
