import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/infrastructure/store';

export async function GET() {
  return NextResponse.json(store.getSupplierConfig());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const updated = store.updateSupplierConfig(body);
    return NextResponse.json({
      success: true,
      config: updated,
      message: 'Конфигурация поставщиков обновлена',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Supplier config error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
