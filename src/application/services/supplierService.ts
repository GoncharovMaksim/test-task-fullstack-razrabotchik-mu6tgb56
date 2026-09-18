import { store } from '@/infrastructure/store';
import { SupplierIssueRequest, SupplierIssueResponse } from '@/domain/types';

export class SupplierService {
  /**
   * Request code from Supplier A.
   * If request_id was previously handled, returns the exact same code.
   */
  async issueFromSupplierA(request: SupplierIssueRequest): Promise<SupplierIssueResponse> {
    const config = store.getSupplierConfig();

    // Key requirement: On repeat with the same request_id, supplier returns the exact same code
    const existingCode = store.supplierACodes.get(request.request_id);
    if (existingCode) {
      return {
        status: 'ok',
        request_id: request.request_id,
        code: existingCode,
      };
    }

    // Simulate timeout if configured
    if (config.supplierATimeoutRate > 0 && Math.random() < config.supplierATimeoutRate) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(config.timeoutMs, 500)));
      throw new Error('Supplier A connection timeout (ETIMEDOUT)');
    }

    // Simulate 5xx server failure if configured
    if (config.supplierAFailRate > 0 && Math.random() < config.supplierAFailRate) {
      return {
        status: 'error',
        reason: 'supplier_a_server_error_503',
      };
    }

    // Attempt to pop key from pool
    const key = store.popAvailableKey(request.order_id);
    if (!key) {
      return {
        status: 'error',
        reason: 'out_of_stock',
      };
    }

    // Cache the issued code for idempotency on request_id
    store.supplierACodes.set(request.request_id, key.code);

    return {
      status: 'ok',
      request_id: request.request_id,
      code: key.code,
    };
  }

  /**
   * Request code from Supplier B (Fallback).
   */
  async issueFromSupplierB(request: SupplierIssueRequest): Promise<SupplierIssueResponse> {
    const config = store.getSupplierConfig();

    const existingCode = store.supplierBCodes.get(request.request_id);
    if (existingCode) {
      return {
        status: 'ok',
        request_id: request.request_id,
        code: existingCode,
      };
    }

    if (config.supplierBFailRate > 0 && Math.random() < config.supplierBFailRate) {
      return {
        status: 'error',
        reason: 'supplier_b_server_error_500',
      };
    }

    const key = store.popAvailableKey(request.order_id);
    if (!key) {
      return {
        status: 'error',
        reason: 'out_of_stock',
      };
    }

    store.supplierBCodes.set(request.request_id, key.code);

    return {
      status: 'ok',
      request_id: request.request_id,
      code: key.code,
    };
  }
}

export const supplierService = new SupplierService();
