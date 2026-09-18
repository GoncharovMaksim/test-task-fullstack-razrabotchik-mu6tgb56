import { Order, KeyItem, PromoCode, ProcessedEvent, PaymentWebhookPayload, SupplierConfig } from '../domain/types';
import productsData from '../data/products.json';
import keysData from '../data/keys.json';
import promocodesData from '../data/promocodes.json';
import { KeyedMutex } from './mutex';

class AppStore {
  private static instance: AppStore;

  public orders = new Map<string, Order>();
  public keys: KeyItem[] = [];
  public promoCodes = new Map<string, PromoCode>();
  public processedEvents = new Map<string, ProcessedEvent>();
  public pendingPayments = new Map<string, PaymentWebhookPayload>();

  // Mutex locks for fine-grained concurrency control
  public orderMutex = new KeyedMutex();
  public promoMutex = new KeyedMutex();
  public poolMutex = new KeyedMutex();

  // Supplier simulation configurations and caches
  public supplierConfig: SupplierConfig = {
    supplierAFailRate: 0.0,
    supplierATimeoutRate: 0.0,
    supplierBFailRate: 0.0,
    timeoutMs: 1500,
  };

  public supplierACodes = new Map<string, string>();
  public supplierBCodes = new Map<string, string>();

  private constructor() {
    this.initDefaultData();
  }

  public static getInstance(): AppStore {
    if (!AppStore.instance) {
      AppStore.instance = new AppStore();
    }
    return AppStore.instance;
  }

  public initDefaultData(): void {
    this.orders.clear();
    this.processedEvents.clear();
    this.pendingPayments.clear();
    this.supplierACodes.clear();
    this.supplierBCodes.clear();

    // Load keys
    this.keys = (keysData as string[]).map((code) => ({
      code,
      isAssigned: false,
    }));

    // Load promo codes
    this.promoCodes.clear();
    for (const p of promocodesData) {
      this.promoCodes.set(p.code.toUpperCase(), {
        code: p.code.toUpperCase(),
        type: p.type as 'percent' | 'amount',
        value: p.value,
        currency: (p as { currency?: string }).currency,
        maxUses: p.max_uses,
        currentUses: 0,
      });
    }
  }

  // --- Orders ---
  public getOrder(id: string): Order | undefined {
    return this.orders.get(id);
  }

  public listOrders(statusFilter?: string): Order[] {
    const list = Array.from(this.orders.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (!statusFilter || statusFilter === 'all') return list;
    if (statusFilter === 'unfulfilled') {
      return list.filter((o) => o.status === 'out_of_stock' || o.status === 'delivery_failed' || o.status === 'paid');
    }
    return list.filter((o) => o.status === statusFilter);
  }

  public saveOrder(order: Order): void {
    this.orders.set(order.id, { ...order, updatedAt: new Date().toISOString() });
  }

  // --- Keys Pool ---
  public getAvailableKeysCount(): number {
    return this.keys.filter((k) => !k.isAssigned).length;
  }

  public listAllKeys(): KeyItem[] {
    return [...this.keys];
  }

  /**
   * Atomically assigns the first unassigned key to an order.
   * Guarantees that a key can never be assigned twice.
   */
  public popAvailableKey(orderId: string): KeyItem | null {
    const key = this.keys.find((k) => !k.isAssigned);
    if (!key) return null;

    key.isAssigned = true;
    key.assignedToOrderId = orderId;
    key.assignedAt = new Date().toISOString();
    return key;
  }

  public restockKeys(newCodes: string[]): number {
    let added = 0;
    const existingCodes = new Set(this.keys.map((k) => k.code));
    for (const code of newCodes) {
      const trimmed = code.trim();
      if (trimmed && !existingCodes.has(trimmed)) {
        this.keys.push({
          code: trimmed,
          isAssigned: false,
        });
        existingCodes.add(trimmed);
        added++;
      }
    }
    return added;
  }

  // --- Promo Codes ---
  public getPromoCode(code: string): PromoCode | undefined {
    return this.promoCodes.get(code.toUpperCase());
  }

  public listPromoCodes(): PromoCode[] {
    return Array.from(this.promoCodes.values());
  }

  /**
   * Atomic attempt to redeem promo code.
   * Returns true if successfully redeemed within limits, false otherwise.
   */
  public tryRedeemPromoCode(code: string): boolean {
    const promo = this.promoCodes.get(code.toUpperCase());
    if (!promo) return false;
    if (promo.currentUses >= promo.maxUses) return false;

    promo.currentUses += 1;
    return true;
  }

  // --- Processed & Pending Events ---
  public isEventProcessed(eventId: string): boolean {
    return this.processedEvents.has(eventId);
  }

  public getProcessedEvent(eventId: string): ProcessedEvent | undefined {
    return this.processedEvents.get(eventId);
  }

  public recordProcessedEvent(event: ProcessedEvent): void {
    this.processedEvents.set(event.eventId, event);
  }

  public recordPendingPayment(payload: PaymentWebhookPayload): void {
    this.pendingPayments.set(payload.order_id, payload);
  }

  public getPendingPayment(orderId: string): PaymentWebhookPayload | undefined {
    return this.pendingPayments.get(orderId);
  }

  public removePendingPayment(orderId: string): void {
    this.pendingPayments.delete(orderId);
  }

  // --- Supplier Simulation Config ---
  public getSupplierConfig(): SupplierConfig {
    return { ...this.supplierConfig };
  }

  public updateSupplierConfig(config: Partial<SupplierConfig>): SupplierConfig {
    this.supplierConfig = { ...this.supplierConfig, ...config };
    return { ...this.supplierConfig };
  }
}

export const store = AppStore.getInstance();
