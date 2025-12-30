import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface DataSource {
  id: string;
  name: string;
  url: string;
  description: string | null;
  row_count: number;
  last_refresh: string | null;
  created_at: string;
  updated_at: string;
}

export interface DataRow {
  id: string;
  data_source_id: string;
  json_data: Record<string, unknown>;
  created_at: string;
}
