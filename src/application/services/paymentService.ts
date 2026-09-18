import { store } from '@/infrastructure/store';
import { PaymentWebhookPayload } from '@/domain/types';
import { deliveryService } from './deliveryService';

export class PaymentService {
  /**
   * Process payment webhook idempotently under concurrency.
   */
  async processWebhook(payload: PaymentWebhookPayload): Promise<{
    status: 'ok' | 'ignored';
    orderStatus?: string;
    message: string;
    keyIssued?: string;
  }> {
    // 1. Event Idempotency: Deduplicate by unique event_id
    if (store.isEventProcessed(payload.event_id)) {
      const existing = store.getProcessedEvent(payload.event_id)!;
      const order = store.getOrder(payload.order_id);
      return {
        status: 'ignored',
        orderStatus: order ? order.status : existing.resultStatus,
        keyIssued: order?.keyIssued,
        message: `Idempotent repeat: event_id '${payload.event_id}' already processed`,
      };
    }

    // Record event as received
    store.recordProcessedEvent({
      eventId: payload.event_id,
      orderId: payload.order_id,
      status: payload.status,
      receivedAt: new Date().toISOString(),
      resultStatus: 'processing',
    });

    // 2. Lock per orderId to serialize parallel webhooks
    return await store.orderMutex.runExclusive(payload.order_id, async () => {
      const order = store.getOrder(payload.order_id);

      // 3. Out-of-order scenario: webhook arrives BEFORE order creation
      if (!order) {
        store.recordPendingPayment(payload);
        return {
          status: 'ok',
          message: `Webhook accepted before order creation: pending credit for order '${payload.order_id}' stored safely`,
        };
      }

      // 4. If order is already in a terminal state (delivered or failed), ignore safely
      if (order.status === 'delivered') {
        return {
          status: 'ignored',
          orderStatus: order.status,
          keyIssued: order.keyIssued,
          message: 'Order has already been delivered, duplicate webhook ignored without duplicate issuance',
        };
      }

      if (order.status === 'payment_failed') {
        return {
          status: 'ignored',
          orderStatus: order.status,
          message: 'Order is already marked as payment_failed',
        };
      }

      // 5. Handle payment failure
      if (payload.status === 'failed') {
        order.status = 'payment_failed';
        order.failureReason = 'Оплата отклонена платежным шлюзом';
        store.saveOrder(order);
        return {
          status: 'ok',
          orderStatus: order.status,
          message: 'Order marked as payment_failed',
        };
      }

      // 6. Handle payment success
      if (payload.status === 'paid') {
        order.status = 'paid';
        store.saveOrder(order);

        // Transition through delivering -> delivered / out_of_stock using internal delivery
        const finalOrder = await deliveryService.deliverOrderInternal(order);
        return {
          status: 'ok',
          orderStatus: finalOrder.status,
          keyIssued: finalOrder.keyIssued,
          message: `Payment successful. Current status: ${finalOrder.status}`,
        };
      }

      return {
        status: 'ignored',
        orderStatus: order.status,
        message: 'Unknown payment status ignored',
      };
    });
  }
}

export const paymentService = new PaymentService();
