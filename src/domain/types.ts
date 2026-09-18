export type ProductType = 'topup' | 'key' | 'subscription' | 'giftcard';

export interface Product {
  sku: string;
  name: string;
  type: ProductType;
  price: number;
  currency: string;
  image: string;
  category: string;
}

export type OrderStatus =
  | 'created'
  | 'paid'
  | 'delivering'
  | 'delivered'
  | 'payment_failed'
  | 'out_of_stock'
  | 'delivery_failed';

export interface Order {
  id: string;
  sku: string;
  productName: string;
  basePrice: number;
  discountAmount: number;
  finalPrice: number;
  currency: string;
  steamLogin?: string;
  promoCode?: string;
  status: OrderStatus;
  keyIssued?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KeyItem {
  code: string;
  isAssigned: boolean;
  assignedToOrderId?: string;
  assignedAt?: string;
}

export interface PromoCode {
  code: string;
  type: 'percent' | 'amount';
  value: number;
  currency?: string;
  maxUses: number;
  currentUses: number;
}

export interface PaymentWebhookPayload {
  event_id: string;
  order_id: string;
  status: 'paid' | 'failed';
  amount: number;
  currency: string;
  created_at: string;
}

export interface ProcessedEvent {
  eventId: string;
  orderId: string;
  status: 'paid' | 'failed';
  receivedAt: string;
  resultStatus: string;
}

export interface SupplierIssueRequest {
  request_id: string;
  sku: string;
  order_id: string;
}

export type SupplierIssueResponse =
  | { status: 'ok'; request_id: string; code: string }
  | { status: 'error'; reason: string };

export interface SupplierConfig {
  supplierAFailRate: number;
  supplierATimeoutRate: number;
  supplierBFailRate: number;
  timeoutMs: number;
}
