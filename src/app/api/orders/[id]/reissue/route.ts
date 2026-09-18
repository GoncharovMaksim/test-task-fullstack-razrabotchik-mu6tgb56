import { NextRequest, NextResponse } from 'next/server';
import { deliveryService } from '@/application/services/deliveryService';
import { DomainError } from '@/domain/errors';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updatedOrder = await deliveryService.reissueOrder(params.id);
    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: updatedOrder.status === 'delivered'
        ? 'Товар успешно выдан'
        : 'Повторная попытка выполнена, но остаток по-прежнему отсутствует',
    });
  } catch (error: unknown) {
    if (error instanceof DomainError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
