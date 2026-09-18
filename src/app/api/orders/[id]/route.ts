import { NextRequest, NextResponse } from 'next/server';
import { orderService } from '@/application/services/orderService';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const order = orderService.getOrder(params.id);
  if (!order) {
    return NextResponse.json({ error: `Заказ ${params.id} не найден` }, { status: 404 });
  }

  return NextResponse.json(order);
}
