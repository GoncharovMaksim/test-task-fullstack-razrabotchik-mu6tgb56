import { NextRequest, NextResponse } from 'next/server';
import { supplierService } from '@/application/services/supplierService';
import { SupplierIssueRequest } from '@/domain/types';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SupplierIssueRequest;

    if (!body.request_id || !body.sku || !body.order_id) {
      return NextResponse.json(
        { status: 'error', reason: 'Missing request_id, sku, or order_id' },
        { status: 400 }
      );
    }

    // Attempt primary supplier A
    try {
      const res = await supplierService.issueFromSupplierA(body);
      if (res.status === 'ok') {
        return NextResponse.json(res, { status: 200 });
      }
      return NextResponse.json(res, { status: 500 });
    } catch {
      // Fallback to supplier B
      const resB = await supplierService.issueFromSupplierB(body);
      if (resB.status === 'ok') {
        return NextResponse.json(resB, { status: 200 });
      }
      return NextResponse.json(resB, { status: 500 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Supplier failure';
    return NextResponse.json({ status: 'error', reason: message }, { status: 500 });
  }
}
