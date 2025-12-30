import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Hardcoded permanent data sources
const HARDcoded_DATA_SOURCES = [
  {
    name: 'Paycom Hours',
    url: 'https://idsp.tech/erp/PBi/csv/paycom_hours_8.csv',
    description: 'Paycom hours data containing employee time tracking information',
  },
  {
    name: 'Recon Amazon Data',
    url: 'https://idsp.tech/erp/PBi/csv/recon_amazon_data.csv',
    description: 'Amazon reconciliation data for order tracking and analysis',
  },
];

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

export async function POST() {
  try {
    const results = [];

    for (const source of HARDCODED_DATA_SOURCES) {
      // Check if data source already exists by URL
      const { data: existing } = await supabase
        .from('data_sources')
        .select('id')
        .eq('url', source.url)
        .single();

      if (existing) {
        // Data source already exists, skip
        results.push({
          name: source.name,
          status: 'skipped',
          message: 'Already exists',
        });
        continue;
      }

      // Create data source
      const { data: dataSource, error: insertError } = await supabase
        .from('data_sources')
        .insert({
          name: source.name,
          url: source.url,
          description: source.description,
        })
        .select()
        .single();

      if (insertError) {
        results.push({
          name: source.name,
          status: 'error',
          message: insertError.message,
        });
        continue;
      }

      // Fetch and parse CSV data
      const csvResponse = await fetch(source.url);
      if (!csvResponse.ok) {
        results.push({
          name: source.name,
          status: 'error',
          message: `Failed to fetch CSV: ${csvResponse.statusText}`,
        });
        continue;
      }

      const csvText = await csvResponse.text();
      const { rows, rowCount } = parseCSV(csvText);

      // Insert rows in batches
      const batchSize = 100;
      let insertedCount = 0;

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
        } else {
          insertedCount += batch.length;
        }
      }

      // Update row count
      await supabase
        .from('data_sources')
        .update({
          row_count: insertedCount,
          last_refresh: new Date().toISOString(),
        })
        .eq('id', dataSource.id);

      results.push({
        name: source.name,
        status: 'success',
        message: `Created with ${insertedCount} rows`,
        rowsInserted: insertedCount,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Initialization complete',
      results,
    });
  } catch (error) {
    console.error('Error in POST /api/initialize:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initialize data sources',
      },
      { status: 500 }
    );
  }
}
