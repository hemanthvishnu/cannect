/**
 * Setup Supabase Logs Table
 * Run with: node scripts/setup-logs-table.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xvjwgucqbemeforxvezu.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2andndWNxYmVtZWZvcnh2ZXp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjgxMTY3OSwiZXhwIjoyMDgyMzg3Njc5fQ.gzPXALUcrU7Tx4dPQUgwoIGcG6Tzv_CrEWeBtUYhgqE';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

// Test insert to verify table exists or create it
async function setupTable() {
  console.log('Testing connection to Supabase...');
  
  // Try to insert a test log
  const { data, error } = await supabase
    .from('app_logs')
    .insert({
      category: 'system',
      action: 'table_setup',
      status: 'success',
      message: 'Logging system initialized',
      platform: 'setup-script'
    })
    .select();

  if (error) {
    if (error.code === '42P01') {
      console.log('Table does not exist. Please create it in Supabase Dashboard SQL Editor.');
      console.log('\nRun this SQL:\n');
      console.log(SQL);
    } else {
      console.error('Error:', error);
    }
  } else {
    console.log('✓ Table exists and working!');
    console.log('✓ Test log inserted:', data);
  }
}

const SQL = `
-- Cannect Live Logging Table
CREATE TABLE app_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  did TEXT,
  session_id TEXT,
  category TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  error TEXT,
  metadata JSONB,
  url TEXT,
  user_agent TEXT,
  platform TEXT,
  app_version TEXT
);

-- Indexes for fast queries
CREATE INDEX idx_logs_created_at ON app_logs(created_at DESC);
CREATE INDEX idx_logs_did ON app_logs(did);
CREATE INDEX idx_logs_category ON app_logs(category);
CREATE INDEX idx_logs_status ON app_logs(status);
CREATE INDEX idx_logs_session ON app_logs(session_id);

-- Row Level Security
ALTER TABLE app_logs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to INSERT (client logging)
CREATE POLICY "Allow anonymous inserts" ON app_logs
  FOR INSERT WITH CHECK (true);

-- Allow service role to SELECT (dashboard viewing)
CREATE POLICY "Service role can read" ON app_logs
  FOR SELECT USING (true);

-- Enable Realtime for live viewing
ALTER PUBLICATION supabase_realtime ADD TABLE app_logs;
`;

setupTable();
