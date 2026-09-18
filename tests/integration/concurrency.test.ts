import { store } from '@/infrastructure/store';
import { orderService } from '@/application/services/orderService';
import { paymentService } from '@/application/services/paymentService';

describe('Concurrency & Race Conditions Integration Test', () => {
  beforeEach(() => {
    store.initDefaultData();
  });

  it('handles 50 parallel webhooks for 1 order with exactly-once key delivery', async () => {
    const order = await orderService.createOrder({ sku: 'KEY-CS2-PRIME' });
    const poolBefore = store.getAvailableKeysCount();

    // 50 concurrent webhooks hitting the system at the same instant
    const webhookPromises = Array.from({ length: 50 }, (_, i) =>
      paymentService.processWebhook({
        event_id: `evt_parallel_50_${i}`,
        order_id: order.id,
        status: 'paid',
        amount: order.finalPrice,
        currency: order.currency,
        created_at: new Date().toISOString(),
      })
    );

    const results = await Promise.all(webhookPromises);
    const poolAfter = store.getAvailableKeysCount();
    const updatedOrder = store.getOrder(order.id)!;

    // 1. Order status is delivered
    expect(updatedOrder.status).toBe('delivered');
    expect(updatedOrder.keyIssued).toBeDefined();

    // 2. Exactly ONE key consumed from pool
    expect(poolBefore - poolAfter).toBe(1);

    // 3. Exactly ONE webhook succeeded, 49 safely ignored as duplicate requests
    const okCount = results.filter((r) => r.status === 'ok').length;
    const ignoredCount = results.filter((r) => r.status === 'ignored').length;

    expect(okCount).toBe(1);
    expect(ignoredCount).toBe(49);
  });

  it('correctly links out-of-order webhook when payment arrives BEFORE order creation', async () => {
    const futureOrderId = `ord_pre_${Date.now()}`;
    const poolBefore = store.getAvailableKeysCount();

    // Webhook arrives first
    const webhookRes = await paymentService.processWebhook({
      event_id: `evt_early_${futureOrderId}`,
      order_id: futureOrderId,
      status: 'paid',
      amount: 1000,
      currency: 'RUB',
      created_at: new Date().toISOString(),
    });

    expect(webhookRes.status).toBe('ok');

    // Order created afterwards
    const createdOrder = await orderService.createOrder({
      sku: 'STEAM-TOPUP-1000',
      customId: futureOrderId,
    });

    const poolAfter = store.getAvailableKeysCount();

    expect(createdOrder.status).toBe('delivered');
    expect(createdOrder.keyIssued).toBeDefined();
    expect(poolBefore - poolAfter).toBe(1);
  });

  it('guarantees no single key is ever assigned to two different orders', async () => {
    // Create 10 different orders concurrently and pay them all simultaneously
    const orders = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        orderService.createOrder({ sku: 'KEY-CS2-PRIME', customId: `ord_multi_${i}` })
      )
    );

    const paymentPromises = orders.map((o) =>
      paymentService.processWebhook({
        event_id: `evt_multi_${o.id}`,
        order_id: o.id,
        status: 'paid',
        amount: o.finalPrice,
        currency: o.currency,
        created_at: new Date().toISOString(),
      })
    );

    await Promise.all(paymentPromises);

    const deliveredOrders = orders.map((o) => store.getOrder(o.id)!);
    const assignedKeys = deliveredOrders.map((o) => o.keyIssued).filter(Boolean);

    // All 10 orders got a key
    expect(assignedKeys.length).toBe(10);

    // All 10 keys must be strictly unique!
    const uniqueKeys = new Set(assignedKeys);
    expect(uniqueKeys.size).toBe(10);
  });
});
