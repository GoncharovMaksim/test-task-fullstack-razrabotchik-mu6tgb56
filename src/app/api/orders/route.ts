import { NextRequest, NextResponse } from 'next/server';
import { orderService } from '@/application/services/orderService';
import { DomainError } from '@/domain/errors';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || undefined;
  const orders = orderService.listOrders(status);
  return NextResponse.json({ orders, total: orders.length });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sku, steamLogin, promoCode, customId } = body;

    if (!sku) {
      return NextResponse.json({ error: 'Поле sku обязательно' }, { status: 400 });
    }

    const order = await orderService.createOrder({
      sku,
      steamLogin,
      promoCode,
      customId,
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
