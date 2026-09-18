import { NextResponse } from 'next/server';
import { store } from '@/infrastructure/store';

export async function GET() {
  const keys = store.listAllKeys();
  const availableCount = store.getAvailableKeysCount();
  const totalCount = keys.length;
  const assignedCount = totalCount - availableCount;

  return NextResponse.json({
    availableCount,
    assignedCount,
    totalCount,
    keys: keys.map((k) => ({
      code: k.code,
      isAssigned: k.isAssigned,
      assignedToOrderId: k.assignedToOrderId,
      assignedAt: k.assignedAt,
    })),
  });
}
