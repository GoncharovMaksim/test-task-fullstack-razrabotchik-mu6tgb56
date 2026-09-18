import { store } from '@/infrastructure/store';
import { orderService } from '@/application/services/orderService';
import { paymentService } from '@/application/services/paymentService';
import { deliveryService } from '@/application/services/deliveryService';
import { supplierService } from '@/application/services/supplierService';

describe('DeliveryService & Recovery', () => {
  beforeEach(() => {
    store.initDefaultData();
    store.updateSupplierConfig({
      supplierAFailRate: 0,
      supplierATimeoutRate: 0,
      supplierBFailRate: 0,
    });
  });

  it('handles empty key pool gracefully by moving to out_of_stock', async () => {
    // Empty out keys pool
    store.keys = [];
    expect(store.getAvailableKeysCount()).toBe(0);

    const order = await orderService.createOrder({ sku: 'KEY-EFT' });

    const result = await paymentService.processWebhook({
      event_id: 'evt_oos_1',
      order_id: order.id,
      status: 'paid',
      amount: order.finalPrice,
      currency: order.currency,
      created_at: new Date().toISOString(),
    });

    expect(result.status).toBe('ok');
    expect(result.orderStatus).toBe('out_of_stock');

    const updated = store.getOrder(order.id)!;
    expect(updated.status).toBe('out_of_stock');
    expect(updated.keyIssued).toBeUndefined();

    // Restock with new keys
    store.restockKeys(['RESTOCKED-KEY-001', 'RESTOCKED-KEY-002']);
    expect(store.getAvailableKeysCount()).toBe(2);

    // Reissue
    const reissued = await deliveryService.reissueOrder(order.id);
    expect(reissued.status).toBe('delivered');
    expect(reissued.keyIssued).toBe('RESTOCKED-KEY-001');
    expect(store.getAvailableKeysCount()).toBe(1);
  });

  it('falls back to Supplier B when Supplier A fails with 5xx', async () => {
    // Configure Supplier A to always fail, Supplier B to succeed
    store.updateSupplierConfig({
      supplierAFailRate: 1.0,
      supplierBFailRate: 0.0,
    });

    const order = await orderService.createOrder({ sku: 'KEY-CS2-PRIME' });
    const delivered = await deliveryService.deliverOrder(order.id);

    expect(delivered.status).toBe('delivered');
    expect(delivered.keyIssued).toBeDefined();
    // Verify it was recorded in supplier B cache
    expect(store.supplierBCodes.has(`req_${order.id}_b`)).toBe(true);
  });

  it('returns the exact same code on repeated request_id to supplier (timeout != failure)', async () => {
    const req = {
      request_id: 'req_test_dedup_1',
      sku: 'STEAM-TOPUP-500',
      order_id: 'ord_dedup_1',
    };

    const first = await supplierService.issueFromSupplierA(req);
    expect(first.status).toBe('ok');
    if (first.status !== 'ok') return;

    const code1 = first.code;
    const poolBefore = store.getAvailableKeysCount();

    // Second call with same request_id
    const second = await supplierService.issueFromSupplierA(req);
    expect(second.status).toBe('ok');
    if (second.status !== 'ok') return;

    expect(second.code).toBe(code1);
    // Pool must not decrease
    expect(store.getAvailableKeysCount()).toBe(poolBefore);
  });
});
