import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('data_sources')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching data sources:', error);
      return NextResponse.json(
        { error: 'Failed to fetch data sources' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/datasources:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, url, description } = body;

    // Validate input
    if (!name || !url) {
      return NextResponse.json(
        { error: 'Name and URL are required' },
        { status: 400 }
      );
    }

    // Check if URL already exists
    const { data: existing } = await supabase
      .from('data_sources')
      .select('id')
      .eq('url', url)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'A data source with this URL already exists' },
        { status: 409 }
      );
    }

    // Create data source
    const { data: dataSource, error: insertError } = await supabase
      .from('data_sources')
      .insert({
        name,
        url,
        description: description || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating data source:', insertError);
      return NextResponse.json(
        { error: 'Failed to create data source' },
        { status: 500 }
      );
    }

    // Fetch and parse CSV data
    const csvResponse = await fetch(url);
    if (!csvResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch CSV: ${csvResponse.statusText}` },
        { status: 400 }
      );
    }

    const csvText = await csvResponse.text();
    const { rows, rowCount } = parseCSV(csvText);

    // Insert rows in batches
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error: batchError } = await supabase
        .from('data_rows')
        .insert(
          batch.map(row => ({
            data_source_id: dataSource.id,
            json_data: row,
          }))
        );

      if (batchError) {
        console.error('Error inserting batch:', batchError);
        // Continue with next batches even if one fails
      }
    }

    // Update row count
    const { error: updateError } = await supabase
      .from('data_sources')
      .update({
        row_count: rowCount,
        last_refresh: new Date().toISOString(),
      })
      .eq('id', dataSource.id);

    if (updateError) {
      console.error('Error updating row count:', updateError);
    }

    // Fetch updated data source
    const { data: updatedDataSource } = await supabase
      .from('data_sources')
      .select('*')
      .eq('id', dataSource.id)
      .single();

    return NextResponse.json(updatedDataSource, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/datasources:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// CSV Parser
function parseCSV(csvText: string) {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) {
    return { rows: [], rowCount: 0 };
  }

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, unknown>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, unknown> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    rows.push(row);
  }

  return { rows, rowCount: rows.length };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}
