import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/application/services/paymentService';
import { PaymentWebhookPayload } from '@/domain/types';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PaymentWebhookPayload;

    if (!body.event_id || !body.order_id || !body.status) {
      return NextResponse.json(
        { error: 'Обязательные поля: event_id, order_id, status' },
        { status: 400 }
      );
    }

    const result = await paymentService.processWebhook({
      event_id: String(body.event_id),
      order_id: String(body.order_id),
      status: body.status === 'failed' ? 'failed' : 'paid',
      amount: Number(body.amount) || 0,
      currency: body.currency || 'RUB',
      created_at: body.created_at || new Date().toISOString(),
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal webhook error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
