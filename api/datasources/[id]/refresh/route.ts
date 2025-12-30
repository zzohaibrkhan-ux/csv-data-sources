import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Fetch the data source
    const { data: dataSource, error: fetchError } = await supabase
      .from('data_sources')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !dataSource) {
      return NextResponse.json(
        { error: 'Data source not found' },
        { status: 404 }
      );
    }

    // Delete all existing rows for this data source
    const { error: deleteError } = await supabase
      .from('data_rows')
      .delete()
      .eq('data_source_id', id);

    if (deleteError) {
      console.error('Error deleting old data:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete old data' },
        { status: 500 }
      );
    }

    // Fetch and parse new CSV data
    const csvResponse = await fetch(dataSource.url);
    if (!csvResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch CSV: ${csvResponse.statusText}` },
        { status: 400 }
      );
    }

    const csvText = await csvResponse.text();
    const { rows, rowCount } = parseCSV(csvText);

    // Insert new rows in batches
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error: batchError } = await supabase
        .from('data_rows')
        .insert(
          batch.map(row => ({
            data_source_id: id,
            json_data: row,
          }))
        );

      if (batchError) {
        console.error('Error inserting batch:', batchError);
      } else {
        insertedCount += batch.length;
      }
    }

    // Update row count and last refresh timestamp
    const { error: updateError } = await supabase
      .from('data_sources')
      .update({
        row_count: insertedCount,
        last_refresh: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating data source:', updateError);
    }

    // Fetch updated data source
    const { data: updatedDataSource } = await supabase
      .from('data_sources')
      .select('*')
      .eq('id', id)
      .single();

    return NextResponse.json({
      message: 'Data source refreshed successfully',
      dataSource: updatedDataSource,
      insertedRows: insertedCount,
    });
  } catch (error) {
    console.error('Error in POST /api/datasources/[id]/refresh:', error);
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
