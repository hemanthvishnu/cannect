-- ============================================================================
-- UNIFIED ARCHITECTURE FIX MIGRATION
-- ============================================================================
-- Version: 2.1.1 - December 24, 2025
-- 
-- Fixes column name mismatches between migration and code:
-- - cached_posts: uri → at_uri, count columns naming
-- - cached_follows: following_did → followee_did
-- - Add missing columns (embed_type, langs, quote_count, expires_at)
-- ============================================================================

-- ============================================================================
-- FIX 1: CACHED_POSTS TABLE - Column Renames
-- ============================================================================

-- Rename uri to at_uri (primary key)
ALTER TABLE cached_posts RENAME COLUMN uri TO at_uri;

-- Rename count columns to match code expectations
ALTER TABLE cached_posts RENAME COLUMN likes_count TO like_count;
ALTER TABLE cached_posts RENAME COLUMN reposts_count TO repost_count;
ALTER TABLE cached_posts RENAME COLUMN replies_count TO reply_count;

-- Rename post_created_at to indexed_at (code uses indexed_at)
ALTER TABLE cached_posts RENAME COLUMN post_created_at TO indexed_at;

-- Add missing columns
ALTER TABLE cached_posts ADD COLUMN IF NOT EXISTS embed_type TEXT;
ALTER TABLE cached_posts ADD COLUMN IF NOT EXISTS langs TEXT[];
ALTER TABLE cached_posts ADD COLUMN IF NOT EXISTS quote_count INTEGER DEFAULT 0;
ALTER TABLE cached_posts ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- ============================================================================
-- FIX 2: CACHED_FOLLOWS TABLE - Column Rename
-- ============================================================================

-- Rename following_did to followee_did
ALTER TABLE cached_follows RENAME COLUMN following_did TO followee_did;

-- Also rename following_is_cannect to followee_is_cannect for consistency
ALTER TABLE cached_follows RENAME COLUMN following_is_cannect TO followee_is_cannect;

-- ============================================================================
-- FIX 3: UPDATE TRIGGERS TO USE NEW COLUMN NAMES
-- ============================================================================

-- Update trigger function for cached_post liked
CREATE OR REPLACE FUNCTION mark_cached_post_liked()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.subject_uri IS NOT NULL AND NEW.user_id IS NOT NULL THEN
    -- This is a Cannect user liking a post
    UPDATE cached_posts
    SET has_cannect_like = TRUE
    WHERE at_uri = NEW.subject_uri;
    
    -- Also mark the author as interacted
    UPDATE cached_profiles
    SET has_interaction = TRUE
    WHERE did = (SELECT author_did FROM cached_posts WHERE at_uri = NEW.subject_uri);
  END IF;
  RETURN NEW;
END;
$$;

-- Update trigger function for cached_post reposted
CREATE OR REPLACE FUNCTION mark_cached_post_reposted()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.subject_uri IS NOT NULL AND NEW.user_id IS NOT NULL THEN
    UPDATE cached_posts
    SET has_cannect_repost = TRUE
    WHERE at_uri = NEW.subject_uri;
    
    UPDATE cached_profiles
    SET has_interaction = TRUE
    WHERE did = (SELECT author_did FROM cached_posts WHERE at_uri = NEW.subject_uri);
  END IF;
  RETURN NEW;
END;
$$;

-- Update touch functions
CREATE OR REPLACE FUNCTION touch_cached_post(post_uri TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE cached_posts
  SET last_accessed_at = NOW(),
      access_count = access_count + 1
  WHERE at_uri = post_uri;
END;
$$;

CREATE OR REPLACE FUNCTION touch_cached_posts(post_uris TEXT[])
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE cached_posts
  SET last_accessed_at = NOW(),
      access_count = access_count + 1
  WHERE at_uri = ANY(post_uris);
END;
$$;

-- ============================================================================
-- FIX 4: UPDATE INDEXES TO USE NEW COLUMN NAMES
-- ============================================================================

-- Drop old indexes referencing 'uri'
DROP INDEX IF EXISTS idx_cached_posts_cleanup;
DROP INDEX IF EXISTS idx_cached_follows_following;

-- Recreate indexes with correct column names
CREATE INDEX IF NOT EXISTS idx_cached_posts_cleanup ON cached_posts(last_accessed_at) 
  WHERE NOT has_cannect_like AND NOT has_cannect_repost AND NOT has_cannect_reply AND NOT is_reply_to_cannect;

CREATE INDEX IF NOT EXISTS idx_cached_follows_followee ON cached_follows(followee_did);

-- ============================================================================
-- FIX 5: CACHED_PROFILES - Add missing columns
-- ============================================================================

-- The code uses 'description' but migration has 'bio' - add description as alias
ALTER TABLE cached_profiles ADD COLUMN IF NOT EXISTS description TEXT;

-- Copy bio to description if bio exists and description is null
UPDATE cached_profiles SET description = bio WHERE description IS NULL AND bio IS NOT NULL;

-- Add expires_at for TTL-based cleanup
ALTER TABLE cached_profiles ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- ============================================================================
-- MIGRATION FIX COMPLETE
-- ============================================================================
