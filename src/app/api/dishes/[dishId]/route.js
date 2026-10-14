import { NextResponse } from 'next/server';
import { updateDish } from '@/services/dishes.service';

export const dynamic = 'force-dynamic';

export async function PATCH(req, { params }) {
  try {
    const body = await req.json().catch(() => null);
    const resolvedParams = await params;
    const { status, body: out } = await updateDish(resolvedParams.dishId, body);
    return NextResponse.json(out, { status });
  } catch (error) {
    console.error('[PATCH /api/dishes/:dishId]', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Something went wrong while saving the dish' },
      { status: 500 }
    );
  }
}
