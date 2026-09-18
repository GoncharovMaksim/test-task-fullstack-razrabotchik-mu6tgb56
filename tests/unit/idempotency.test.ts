import { store } from '@/infrastructure/store';
import { orderService } from '@/application/services/orderService';
import { paymentService } from '@/application/services/paymentService';
import { deliveryService } from '@/application/services/deliveryService';

describe('Idempotency & Deduplication', () => {
  beforeEach(() => {
    store.initDefaultData();
  });

  it('safely ignores duplicate webhook with the same event_id', async () => {
    const order = await orderService.createOrder({ sku: 'KEY-CS2-PRIME' });
    const eventId = 'evt_test_unique_123';

    const first = await paymentService.processWebhook({
      event_id: eventId,
      order_id: order.id,
      status: 'paid',
      amount: order.finalPrice,
      currency: order.currency,
      created_at: new Date().toISOString(),
    });

    expect(first.status).toBe('ok');
    expect(first.orderStatus).toBe('delivered');
    expect(first.keyIssued).toBeDefined();

    const poolCountAfterFirst = store.getAvailableKeysCount();

    // Duplicate webhook with identical event_id
    const duplicate = await paymentService.processWebhook({
      event_id: eventId,
      order_id: order.id,
      status: 'paid',
      amount: order.finalPrice,
      currency: order.currency,
      created_at: new Date().toISOString(),
    });

    expect(duplicate.status).toBe('ignored');
    expect(duplicate.keyIssued).toBe(first.keyIssued);
    // Key pool count must not decrease
    expect(store.getAvailableKeysCount()).toBe(poolCountAfterFirst);
  });

  it('guarantees manual reissue on delivered order is strictly idempotent', async () => {
    const order = await orderService.createOrder({ sku: 'KEY-GTA5' });
    await paymentService.processWebhook({
      event_id: 'evt_del_1',
      order_id: order.id,
      status: 'paid',
      amount: order.finalPrice,
      currency: order.currency,
      created_at: new Date().toISOString(),
    });

    const deliveredOrder = store.getOrder(order.id)!;
    expect(deliveredOrder.status).toBe('delivered');
    const firstKey = deliveredOrder.keyIssued;
    expect(firstKey).toBeDefined();

    const poolBefore = store.getAvailableKeysCount();

    // Trigger reissue
    const reissuedOrder = await deliveryService.reissueOrder(order.id);

    expect(reissuedOrder.status).toBe('delivered');
    expect(reissuedOrder.keyIssued).toBe(firstKey);
    // Zero additional keys consumed
    expect(store.getAvailableKeysCount()).toBe(poolBefore);
  });
});
