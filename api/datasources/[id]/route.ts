import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Delete the data source (cascade delete will remove associated rows)
    const { error } = await supabase
      .from('data_sources')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting data source:', error);
      return NextResponse.json(
        { error: 'Failed to delete data source' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Data source deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/datasources/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
