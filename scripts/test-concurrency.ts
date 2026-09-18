import { store } from '../src/infrastructure/store';
import { orderService } from '../src/application/services/orderService';
import { paymentService } from '../src/application/services/paymentService';
import { deliveryService } from '../src/application/services/deliveryService';
import { promoService } from '../src/application/services/promoService';

async function runCliConcurrencyTests() {
  console.log('===============================================================');
  console.log('  CONCURRENCY & EXACTLY-ONCE DELIVERY TEST RUNNER');
  console.log('===============================================================\n');

  store.initDefaultData();

  // Test 1: 50 Parallel Webhooks
  console.log('[1/5] Testing 50 parallel webhooks for 1 order...');
  const order1 = await orderService.createOrder({ sku: 'KEY-CS2-PRIME' });
  const poolBefore1 = store.getAvailableKeysCount();

  const webhooks = Array.from({ length: 50 }, (_, i) =>
    paymentService.processWebhook({
      event_id: `evt_cli_50_${i}`,
      order_id: order1.id,
      status: 'paid',
      amount: order1.finalPrice,
      currency: order1.currency,
      created_at: new Date().toISOString(),
    })
  );

  const webhookResults = await Promise.all(webhooks);
  const poolAfter1 = store.getAvailableKeysCount();
  const order1Final = store.getOrder(order1.id)!;
  const ok1 = webhookResults.filter((r) => r.status === 'ok').length;
  const ignored1 = webhookResults.filter((r) => r.status === 'ignored').length;
  const keysLost1 = poolBefore1 - poolAfter1;

  if (order1Final.status === 'delivered' && keysLost1 === 1 && ok1 === 1 && ignored1 === 49) {
    console.log(`  PASSED: 1 delivery accepted, 49 duplicates ignored, 1 key consumed (${order1Final.keyIssued})\n`);
  } else {
    console.error(`  FAILED: ok=${ok1}, ignored=${ignored1}, keysConsumed=${keysLost1}\n`);
    process.exit(1);
  }

  // Test 2: Repeat with exact same event_id
  console.log('[2/5] Testing duplicate webhook with identical event_id...');
  const order2 = await orderService.createOrder({ sku: 'KEY-GTA5' });
  const evtId = 'evt_exact_same_999';

  const resA = await paymentService.processWebhook({
    event_id: evtId,
    order_id: order2.id,
    status: 'paid',
    amount: order2.finalPrice,
    currency: order2.currency,
    created_at: new Date().toISOString(),
  });

  const resB = await paymentService.processWebhook({
    event_id: evtId,
    order_id: order2.id,
    status: 'paid',
    amount: order2.finalPrice,
    currency: order2.currency,
    created_at: new Date().toISOString(),
  });

  if (resA.status === 'ok' && resB.status === 'ignored' && resB.keyIssued === resA.keyIssued) {
    console.log(`  PASSED: second call ignored, exact same key returned (${resB.keyIssued})\n`);
  } else {
    console.error(`  FAILED: resA=${resA.status}, resB=${resB.status}\n`);
    process.exit(1);
  }

  // Test 3: Webhook arrived before order creation
  console.log('[3/5] Testing out-of-order webhook (arrived before order)...');
  const futureOrderId = `ord_pre_cli_${Date.now()}`;
  const preRes = await paymentService.processWebhook({
    event_id: `evt_early_${futureOrderId}`,
    order_id: futureOrderId,
    status: 'paid',
    amount: 1000,
    currency: 'RUB',
    created_at: new Date().toISOString(),
  });

  const createdEarly = await orderService.createOrder({
    sku: 'STEAM-TOPUP-1000',
    customId: futureOrderId,
  });

  if (preRes.status === 'ok' && createdEarly.status === 'delivered' && !!createdEarly.keyIssued) {
    console.log(`  PASSED: pending payment resolved automatically, code issued (${createdEarly.keyIssued})\n`);
  } else {
    console.error(`  FAILED: preRes=${preRes.status}, status=${createdEarly.status}\n`);
    process.exit(1);
  }

  // Test 4: Empty pool recovery
  console.log('[4/5] Testing empty pool recovery (out_of_stock -> restock -> reissue)...');
  const backupKeys = [...store.keys];
  store.keys = []; // empty

  const orderEmpty = await orderService.createOrder({ sku: 'KEY-EFT' });
  await paymentService.processWebhook({
    event_id: `evt_empty_${orderEmpty.id}`,
    order_id: orderEmpty.id,
    status: 'paid',
    amount: orderEmpty.finalPrice,
    currency: orderEmpty.currency,
    created_at: new Date().toISOString(),
  });

  const emptyStatus = store.getOrder(orderEmpty.id)!.status;
  store.restockKeys(['RESTOCKED-CLI-KEY-42']);
  const reissued = await deliveryService.reissueOrder(orderEmpty.id);
  const secondReissue = await deliveryService.reissueOrder(orderEmpty.id);

  store.keys = backupKeys;

  if (emptyStatus === 'out_of_stock' && reissued.status === 'delivered' && secondReissue.keyIssued === 'RESTOCKED-CLI-KEY-42') {
    console.log(`  PASSED: out_of_stock handled without crashing, reissued successfully (${reissued.keyIssued})\n`);
  } else {
    console.error(`  FAILED: emptyStatus=${emptyStatus}, reissued=${reissued.status}\n`);
    process.exit(1);
  }

  // Test 5: Promo code LIMIT3 concurrency
  console.log('[5/5] Testing LIMIT3 promo code (max 3) under 20 concurrent requests...');
  const promo = store.getPromoCode('LIMIT3')!;
  promo.currentUses = 0;

  const promoOrders = await Promise.all(
    Array.from({ length: 20 }, () =>
      orderService.createOrder({ sku: 'KEY-CS2-PRIME', promoCode: 'LIMIT3' }).then(
        () => ({ ok: true }),
        () => ({ ok: false })
      )
    )
  );

  const promoSuccess = promoOrders.filter((o) => o.ok).length;
  const promoFailed = promoOrders.filter((o) => !o.ok).length;
  const recordedUses = store.getPromoCode('LIMIT3')!.currentUses;

  if (promoSuccess === 3 && promoFailed === 17 && recordedUses === 3) {
    console.log(`  PASSED: exactly 3 orders applied discount, 17 rejected, recorded uses = 3\n`);
  } else {
    console.error(`  FAILED: success=${promoSuccess}, failed=${promoFailed}, uses=${recordedUses}\n`);
    process.exit(1);
  }

  console.log('===============================================================');
  console.log('  ALL CONCURRENCY AND RESILIENCE TESTS PASSED SUCCESSFULLY!');
  console.log('===============================================================');
}

runCliConcurrencyTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
