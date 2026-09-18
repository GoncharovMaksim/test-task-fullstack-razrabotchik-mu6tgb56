import { NextResponse } from 'next/server';
import { orderService } from '@/application/services/orderService';
import { paymentService } from '@/application/services/paymentService';
import { promoService } from '@/application/services/promoService';
import { deliveryService } from '@/application/services/deliveryService';
import { store } from '@/infrastructure/store';

export async function POST() {
  const results: Array<{
    scenario: string;
    description: string;
    passed: boolean;
    details: Record<string, unknown>;
  }> = [];

  const startTime = Date.now();

  // Reset store to a clean test state
  store.initDefaultData();

  // -------------------------------------------------------------
  // Scenario 1: 50 Parallel Webhooks for 1 Order
  // -------------------------------------------------------------
  try {
    const order1 = await orderService.createOrder({ sku: 'KEY-CS2-PRIME' });
    const poolBefore = store.getAvailableKeysCount();

    // Fire 50 concurrent webhooks
    const webhookPromises = Array.from({ length: 50 }, (_, i) =>
      paymentService.processWebhook({
        event_id: `evt_50_${order1.id}_${i}`,
        order_id: order1.id,
        status: 'paid',
        amount: order1.finalPrice,
        currency: order1.currency,
        created_at: new Date().toISOString(),
      })
    );

    const webhookResults = await Promise.all(webhookPromises);
    const order1After = store.getOrder(order1.id)!;
    const poolAfter = store.getAvailableKeysCount();

    const okCount = webhookResults.filter((r) => r.status === 'ok').length;
    const ignoredCount = webhookResults.filter((r) => r.status === 'ignored').length;
    const keysConsumed = poolBefore - poolAfter;

    const passed =
      order1After.status === 'delivered' &&
      !!order1After.keyIssued &&
      keysConsumed === 1 &&
      okCount === 1 &&
      ignoredCount === 49;

    results.push({
      scenario: '50_PARALLEL_WEBHOOKS',
      description: '50 параллельных вебхуков "оплачено" по одному заказу',
      passed,
      details: {
        orderId: order1.id,
        finalStatus: order1After.status,
        keyIssued: order1After.keyIssued,
        keysConsumed,
        acceptedWebhooks: okCount,
        ignoredDuplicates: ignoredCount,
      },
    });
  } catch (err: unknown) {
    results.push({
      scenario: '50_PARALLEL_WEBHOOKS',
      description: '50 параллельных вебхуков',
      passed: false,
      details: { error: err instanceof Error ? err.message : String(err) },
    });
  }

  // -------------------------------------------------------------
  // Scenario 2: Duplicate Webhook with same event_id
  // -------------------------------------------------------------
  try {
    const order2 = await orderService.createOrder({ sku: 'KEY-GTA5' });
    const eventId = `evt_dup_${order2.id}`;

    const res1 = await paymentService.processWebhook({
      event_id: eventId,
      order_id: order2.id,
      status: 'paid',
      amount: order2.finalPrice,
      currency: order2.currency,
      created_at: new Date().toISOString(),
    });

    const res2 = await paymentService.processWebhook({
      event_id: eventId, // Duplicate event_id
      order_id: order2.id,
      status: 'paid',
      amount: order2.finalPrice,
      currency: order2.currency,
      created_at: new Date().toISOString(),
    });

    const passed = res1.status === 'ok' && res2.status === 'ignored' && res2.keyIssued === res1.keyIssued;

    results.push({
      scenario: 'DUPLICATE_EVENT_ID',
      description: 'Повторный вебхук с тем же event_id ничего не меняет (идемпотентность)',
      passed,
      details: {
        firstCallStatus: res1.status,
        secondCallStatus: res2.status,
        sameKeyRetained: res2.keyIssued === res1.keyIssued,
      },
    });
  } catch (err: unknown) {
    results.push({
      scenario: 'DUPLICATE_EVENT_ID',
      description: 'Повторный вебхук с тем же event_id',
      passed: false,
      details: { error: err instanceof Error ? err.message : String(err) },
    });
  }

  // -------------------------------------------------------------
  // Scenario 3: Out-of-Order Webhook (Arrived BEFORE Order Created)
  // -------------------------------------------------------------
  try {
    const futureOrderId = `ord_future_${Date.now()}`;
    const poolBefore = store.getAvailableKeysCount();

    // 1. Webhook arrives BEFORE order exists
    const webhookRes = await paymentService.processWebhook({
      event_id: `evt_pre_${futureOrderId}`,
      order_id: futureOrderId,
      status: 'paid',
      amount: 1000,
      currency: 'RUB',
      created_at: new Date().toISOString(),
    });

    // 2. Client finishes order creation moments later
    const createdOrder = await orderService.createOrder({
      sku: 'STEAM-TOPUP-1000',
      customId: futureOrderId,
    });

    const poolAfter = store.getAvailableKeysCount();
    const passed =
      webhookRes.status === 'ok' &&
      createdOrder.status === 'delivered' &&
      !!createdOrder.keyIssued &&
      poolBefore - poolAfter === 1;

    results.push({
      scenario: 'OUT_OF_ORDER_DELIVERY',
      description: 'Вебхук пришел раньше создания заказа: корректная связка и выдача без потерь',
      passed,
      details: {
        preWebhookStatus: webhookRes.status,
        finalOrderStatus: createdOrder.status,
        keyIssued: createdOrder.keyIssued,
        keysConsumed: poolBefore - poolAfter,
      },
    });
  } catch (err: unknown) {
    results.push({
      scenario: 'OUT_OF_ORDER_DELIVERY',
      description: 'Вебхук пришел раньше создания заказа',
      passed: false,
      details: { error: err instanceof Error ? err.message : String(err) },
    });
  }

  // -------------------------------------------------------------
  // Scenario 4: Empty Key Pool + Out-of-Stock Recovery + Reissue
  // -------------------------------------------------------------
  try {
    // Empty out pool
    const savedKeys = [...store.keys];
    store.keys = []; // 0 keys

    const order4 = await orderService.createOrder({ sku: 'KEY-EFT' });
    await paymentService.processWebhook({
      event_id: `evt_empty_${order4.id}`,
      order_id: order4.id,
      status: 'paid',
      amount: order4.finalPrice,
      currency: order4.currency,
      created_at: new Date().toISOString(),
    });

    const orderAfterFail = store.getOrder(order4.id)!;
    const isOutOfStock = orderAfterFail.status === 'out_of_stock';

    // Now restock with 1 new key
    const newKey = 'RECOVER-KEY-9999-VAL';
    store.restockKeys([newKey]);

    // Perform safe manual reissue
    const reissuedOrder = await deliveryService.reissueOrder(order4.id);

    // Try a second reissue: must be idempotent and return the same key without consuming new keys!
    const secondReissue = await deliveryService.reissueOrder(order4.id);

    // Restore pool
    store.keys = savedKeys;

    const passed =
      isOutOfStock &&
      reissuedOrder.status === 'delivered' &&
      reissuedOrder.keyIssued === newKey &&
      secondReissue.keyIssued === newKey;

    results.push({
      scenario: 'EMPTY_POOL_RECOVERY',
      description: 'Пустой пул: заказ в out_of_stock, после пополнения ручная выдача дает ровно 1 ключ',
      passed,
      details: {
        stateWhenEmpty: orderAfterFail.status,
        stateAfterReissue: reissuedOrder.status,
        keyIssued: reissuedOrder.keyIssued,
        idempotentReissueSuccess: secondReissue.keyIssued === reissuedOrder.keyIssued,
      },
    });
  } catch (err: unknown) {
    results.push({
      scenario: 'EMPTY_POOL_RECOVERY',
      description: 'Пустой пул ключей и восстановление',
      passed: false,
      details: { error: err instanceof Error ? err.message : String(err) },
    });
  }

  // -------------------------------------------------------------
  // Scenario 5: Promo Code Limit under Concurrent Requests
  // -------------------------------------------------------------
  try {
    // LIMIT3 promo has max_uses = 3
    const promoCode = 'LIMIT3';
    const promo = store.getPromoCode(promoCode)!;
    promo.currentUses = 0; // Reset usage for clean test

    // Launch 20 parallel order creation attempts with LIMIT3
    const orderPromises = Array.from({ length: 20 }, () =>
      orderService.createOrder({
        sku: 'KEY-CS2-PRIME',
        promoCode,
      }).then(
        (res) => ({ success: true, order: res }),
        (err) => ({ success: false, error: err.message })
      )
    );

    const outcomes = await Promise.all(orderPromises);
    const successful = outcomes.filter((o) => o.success).length;
    const rejected = outcomes.filter((o) => !o.success).length;
    const finalUses = store.getPromoCode(promoCode)!.currentUses;

    const passed = successful === 3 && rejected === 17 && finalUses === 3;

    results.push({
      scenario: 'PROMO_CONCURRENCY_LIMIT',
      description: 'Промокод LIMIT3 (макс 3) под 20 параллельными запросами: применен ровно 3 раза',
      passed,
      details: {
        totalRequests: 20,
        allowedDiscountOrders: successful,
        rejectedLimitOrders: rejected,
        finalUsesRecorded: finalUses,
        maxUsesAllowed: 3,
      },
    });
  } catch (err: unknown) {
    results.push({
      scenario: 'PROMO_CONCURRENCY_LIMIT',
      description: 'Промокод с лимитом под гонками',
      passed: false,
      details: { error: err instanceof Error ? err.message : String(err) },
    });
  }

  const durationMs = Date.now() - startTime;
  const allPassed = results.every((r) => r.passed);

  return NextResponse.json({
    success: allPassed,
    durationMs,
    totalScenarios: results.length,
    passedCount: results.filter((r) => r.passed).length,
    results,
  });
}
