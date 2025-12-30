import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Fetch all rows for this data source
    const { data, error } = await supabase
      .from('data_rows')
      .select('json_data')
      .eq('data_source_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching data for export:', error);
      return NextResponse.json(
        { error: 'Failed to fetch data' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return new Response('No data to export', { status: 404 });
    }

    // Extract headers from first row
    const headers = Object.keys(data[0].json_data as Record<string, unknown>);

    // Convert to CSV format
    const csvLines = [headers.join(',')];

    data.forEach(item => {
      const row = item.json_data as Record<string, unknown>;
      const values = headers.map(header => {
        const value = row[header];
        const stringValue = value === null || value === undefined ? '' : String(value);
        // Escape quotes and wrap in quotes if contains comma or quote
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csvLines.push(values.join(','));
    });

    const csvContent = csvLines.join('\n');

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="export_${id}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/datasources/[id]/export:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
