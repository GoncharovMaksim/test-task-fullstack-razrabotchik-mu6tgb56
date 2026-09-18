export class DomainError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export class OrderNotFoundError extends DomainError {
  constructor(orderId: string) {
    super(`Order with id '${orderId}' not found`, 'ORDER_NOT_FOUND');
  }
}

export class ProductNotFoundError extends DomainError {
  constructor(sku: string) {
    super(`Product with sku '${sku}' not found`, 'PRODUCT_NOT_FOUND');
  }
}

export class OutOfStockError extends DomainError {
  constructor(sku: string) {
    super(`No available keys for SKU '${sku}'`, 'OUT_OF_STOCK');
  }
}

export class PromoCodeError extends DomainError {
  constructor(message: string, code: string = 'PROMO_CODE_ERROR') {
    super(message, code);
  }
}

export class InvalidStateTransitionError extends DomainError {
  constructor(from: string, to: string) {
    super(`Cannot transition order from '${from}' to '${to}'`, 'INVALID_STATE_TRANSITION');
  }
}
