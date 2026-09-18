import { store } from '@/infrastructure/store';
import { Order } from '@/domain/types';
import { ProductNotFoundError } from '@/domain/errors';
import productsData from '@/data/products.json';
import { promoService } from './promoService';
import { deliveryService } from './deliveryService';

export interface CreateOrderParams {
  sku: string;
  steamLogin?: string;
  promoCode?: string;
  customId?: string; // Optional custom ID for deterministic test scenarios (e.g. out-of-order test)
}

export class OrderService {
  /**
   * Create an order with server-calculated price and optional atomic promo code deduction.
   * Also checks for pending out-of-order webhook payments.
   */
  async createOrder(params: CreateOrderParams): Promise<Order> {
    const product = productsData.find((p) => p.sku === params.sku);
    if (!product) {
      throw new ProductNotFoundError(params.sku);
    }

    let discountAmount = 0;
    let finalPrice = product.price;

    if (params.promoCode && params.promoCode.trim()) {
      const result = await promoService.applyPromoConcurrently(params.promoCode.trim(), product.price);
      discountAmount = result.discountAmount;
      finalPrice = result.finalPrice;
    }

    const orderId = params.customId || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const order: Order = {
      id: orderId,
      sku: product.sku,
      productName: product.name,
      basePrice: product.price,
      discountAmount,
      finalPrice,
      currency: product.currency,
      steamLogin: params.steamLogin?.trim(),
      promoCode: params.promoCode?.trim().toUpperCase(),
      status: 'created',
      createdAt: now,
      updatedAt: now,
    };

    store.saveOrder(order);

    // Check if an out-of-order payment webhook arrived before order creation
    const pendingPayment = store.getPendingPayment(orderId);
    if (pendingPayment) {
      store.removePendingPayment(orderId);

      if (pendingPayment.status === 'failed') {
        order.status = 'payment_failed';
        order.failureReason = 'Оплата была отклонена до создания заказа';
        store.saveOrder(order);
      } else if (pendingPayment.status === 'paid') {
        order.status = 'paid';
        store.saveOrder(order);
        // Trigger delivery
        return await deliveryService.deliverOrder(order.id);
      }
    }

    return order;
  }

  getOrder(id: string): Order | undefined {
    return store.getOrder(id);
  }

  listOrders(filter?: string): Order[] {
    return store.listOrders(filter);
  }
}

export const orderService = new OrderService();
