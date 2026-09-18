import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/infrastructure/store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keys } = body;

    if (!Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json({ error: 'Поле keys должно быть непустым массивом строк' }, { status: 400 });
    }

    const added = store.restockKeys(keys);
    const availableCount = store.getAvailableKeysCount();

    return NextResponse.json({
      success: true,
      added,
      availableCount,
      message: `Успешно добавлено ${added} новых ключей. Доступно: ${availableCount}`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Restock error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
