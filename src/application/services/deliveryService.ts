import { store } from '@/infrastructure/store';
import { Order } from '@/domain/types';
import { OrderNotFoundError, InvalidStateTransitionError } from '@/domain/errors';
import { supplierService } from './supplierService';

export class DeliveryService {
  /**
   * Safe, exactly-once delivery process for an order, guarded by orderMutex.
   */
  async deliverOrder(orderId: string): Promise<Order> {
    return await store.orderMutex.runExclusive(orderId, async () => {
      const order = store.getOrder(orderId);
      if (!order) {
        throw new OrderNotFoundError(orderId);
      }
      return await this.deliverOrderInternal(order);
    });
  }

  /**
   * Internal delivery execution (must be called when orderMutex for this order is already held).
   */
  async deliverOrderInternal(order: Order): Promise<Order> {
    // Idempotency: If key has already been issued, return existing order without consuming extra keys
    if (order.status === 'delivered') {
      return order;
    }

    // Mark order as delivering
    order.status = 'delivering';
    store.saveOrder(order);

    let issuedCode: string | null = null;
    let failureReason = '';

    // 1. Try Primary Supplier (Supplier A)
    try {
      const responseA = await supplierService.issueFromSupplierA({
        request_id: `req_${order.id}_a`,
        sku: order.sku,
        order_id: order.id,
      });

      if (responseA.status === 'ok') {
        issuedCode = responseA.code;
      } else if (responseA.reason === 'out_of_stock') {
        failureReason = 'out_of_stock';
      } else {
        failureReason = responseA.reason;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Supplier A timeout/error';
      failureReason = `supplier_a_failure: ${message}`;
    }

    // 2. If Supplier A failed and it's not strictly out_of_stock, try Fallback Supplier (Supplier B)
    if (!issuedCode && failureReason !== 'out_of_stock') {
      try {
        const responseB = await supplierService.issueFromSupplierB({
          request_id: `req_${order.id}_b`,
          sku: order.sku,
          order_id: order.id,
        });

        if (responseB.status === 'ok') {
          issuedCode = responseB.code;
        } else if (responseB.reason === 'out_of_stock') {
          failureReason = 'out_of_stock';
        } else {
          failureReason = responseB.reason;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Supplier B timeout/error';
        failureReason = `supplier_b_failure: ${message}`;
      }
    }

    // 3. Fallback to direct pool pop if suppliers aren't configured or as additional guarantee
    if (!issuedCode && failureReason !== 'out_of_stock') {
      const directKey = store.popAvailableKey(order.id);
      if (directKey) {
        issuedCode = directKey.code;
      } else {
        failureReason = 'out_of_stock';
      }
    }

    // Handle delivery result
    if (issuedCode) {
      order.status = 'delivered';
      order.keyIssued = issuedCode;
      order.failureReason = undefined;
    } else if (failureReason === 'out_of_stock') {
      // Recoverable state: paid but out of stock. Safe to restock and retry!
      order.status = 'out_of_stock';
      order.failureReason = 'Пул ключей пуст. Оплата сохранена, требуется пополнение склада.';
    } else {
      // Recoverable state: external supplier failure
      order.status = 'delivery_failed';
      order.failureReason = `Сбой выдачи: ${failureReason}`;
    }

    store.saveOrder(order);
    return order;
  }

  /**
   * Safe, idempotent manual reissue from admin panel after restock or supplier fix.
   */
  async reissueOrder(orderId: string): Promise<Order> {
    return await store.orderMutex.runExclusive(orderId, async () => {
      const order = store.getOrder(orderId);
      if (!order) {
        throw new OrderNotFoundError(orderId);
      }

      // Idempotency check: never reissue or consume a second key if already delivered
      if (order.status === 'delivered') {
        return order;
      }

      if (order.status !== 'out_of_stock' && order.status !== 'delivery_failed' && order.status !== 'paid') {
        throw new InvalidStateTransitionError(order.status, 'delivering');
      }

      // Attempt key delivery directly from pool or suppliers
      const directKey = store.popAvailableKey(order.id);
      if (directKey) {
        order.status = 'delivered';
        order.keyIssued = directKey.code;
        order.failureReason = undefined;
        store.saveOrder(order);
        return order;
      }

      // Still out of stock
      order.status = 'out_of_stock';
      order.failureReason = 'Повторная попытка: пул ключей все еще пуст. Пополните остатки.';
      store.saveOrder(order);
      return order;
    });
  }
}

export const deliveryService = new DeliveryService();
