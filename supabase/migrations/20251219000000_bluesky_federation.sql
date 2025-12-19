-- =====================================================
-- Bluesky Federation - Add DID and App Password columns
-- =====================================================

-- Add Bluesky federation columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bsky_did TEXT,
ADD COLUMN IF NOT EXISTS bsky_app_password_encrypted TEXT,
ADD COLUMN IF NOT EXISTS bsky_sync_enabled BOOLEAN DEFAULT FALSE;

-- Index for DID lookups (used by ATProto verification)
CREATE INDEX IF NOT EXISTS idx_profiles_bsky_did 
ON profiles(bsky_did) 
WHERE bsky_did IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN profiles.bsky_did IS 'Bluesky DID (did:plc:xxx) - used for handle verification';
COMMENT ON COLUMN profiles.bsky_app_password_encrypted IS 'AES-256 encrypted Bluesky App Password';
COMMENT ON COLUMN profiles.bsky_sync_enabled IS 'Whether to sync posts to Bluesky';
