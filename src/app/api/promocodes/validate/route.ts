import { NextRequest, NextResponse } from 'next/server';
import { promoService } from '@/application/services/promoService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, basePrice } = body;

    if (!code || typeof basePrice !== 'number') {
      return NextResponse.json(
        { error: 'Требуются параметры code и basePrice (число)' },
        { status: 400 }
      );
    }

    const result = promoService.validatePromo(code, basePrice);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Promo validation error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
