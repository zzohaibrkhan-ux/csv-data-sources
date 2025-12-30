import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Fetch first 10 rows
    const { data, error } = await supabase
      .from('data_rows')
      .select('json_data')
      .eq('data_source_id', id)
      .order('created_at', { ascending: true })
      .limit(10);

    if (error) {
      console.error('Error fetching preview data:', error);
      return NextResponse.json(
        { error: 'Failed to fetch preview data' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ columns: [], rows: [] });
    }

    // Extract columns from first row
    const columns = Object.keys(data[0].json_data as Record<string, unknown>);
    const rows = data.map(item => item.json_data as Record<string, unknown>);

    return NextResponse.json({ columns, rows });
  } catch (error) {
    console.error('Error in GET /api/datasources/[id]/preview:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
