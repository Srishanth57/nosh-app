import { NextResponse } from 'next/server';
import { listDishes } from '@/services/dishes.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { status, body } = await listDishes();
    return NextResponse.json(body, { status });
  } catch (error) {
    console.error('[GET /api/dishes]', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Could not load dishes. Check the database connection.' },
      { status: 500 }
    );
  }
}
