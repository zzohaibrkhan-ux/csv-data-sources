import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    // Direct SQL execution using supabase client
    // Since Supabase doesn't support raw SQL through the JS client directly,
    // we'll provide the SQL for manual execution

    const sqlSchema = `
-- Create data_sources table
CREATE TABLE IF NOT EXISTS data_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  description TEXT,
  row_count INTEGER DEFAULT 0,
  last_refresh TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create data_rows table
CREATE TABLE IF NOT EXISTS data_rows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
  json_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_data_rows_data_source_id ON data_rows(data_source_id);
CREATE INDEX IF NOT EXISTS idx_data_sources_created_at ON data_sources(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_rows_created_at ON data_rows(created_at DESC);

-- Enable Row Level Security
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_rows ENABLE ROW LEVEL SECURITY;

-- Allow public access for development
DROP POLICY IF EXISTS "Enable read access for all users on data_sources" ON data_sources;
CREATE POLICY "Enable read access for all users on data_sources" ON data_sources FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users on data_sources" ON data_sources;
CREATE POLICY "Enable insert access for all users on data_sources" ON data_sources FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for all users on data_sources" ON data_sources;
CREATE POLICY "Enable update access for all users on data_sources" ON data_sources FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete access for all users on data_sources" ON data_sources;
CREATE POLICY "Enable delete access for all users on data_sources" ON data_sources FOR DELETE USING (true);

DROP POLICY IF EXISTS "Enable read access for all users on data_rows" ON data_rows;
CREATE POLICY "Enable read access for all users on data_rows" ON data_rows FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users on data_rows" ON data_rows;
CREATE POLICY "Enable insert access for all users on data_rows" ON data_rows FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete access for all users on data_rows" ON data_rows;
CREATE POLICY "Enable delete access for all users on data_rows" ON data_rows FOR DELETE USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_data_sources_updated_at ON data_sources;
CREATE TRIGGER update_data_sources_updated_at BEFORE UPDATE ON data_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `.trim();

    return NextResponse.json({
      success: true,
      message: 'Please execute the following SQL in your Supabase SQL Editor',
      sql: sqlSchema,
      instructions: [
        '1. Go to your Supabase dashboard',
        '2. Navigate to SQL Editor',
        '3. Click "New query"',
        '4. Paste the SQL from the "sql" field above',
        '5. Click Run to create the tables'
      ]
    });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate database schema'
      },
      { status: 500 }
    );
  }
}
