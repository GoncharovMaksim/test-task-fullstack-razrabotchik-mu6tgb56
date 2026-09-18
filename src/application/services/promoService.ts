import { store } from '@/infrastructure/store';
import { PromoCodeError } from '@/domain/errors';
import { PromoCode } from '@/domain/types';

export interface PromoValidationResult {
  valid: boolean;
  code: string;
  type?: 'percent' | 'amount';
  value?: number;
  discountAmount: number;
  finalPrice: number;
  remainingUses?: number;
  error?: string;
}

export class PromoService {
  /**
   * Calculate discount amount without mutating usage counters (read-only validation)
   */
  calculateDiscount(promo: PromoCode, basePrice: number): number {
    if (promo.type === 'percent') {
      return Math.round((basePrice * promo.value) / 100);
    } else {
      return Math.min(promo.value, basePrice);
    }
  }

  /**
   * Validate promo code and preview discount calculation
   */
  validatePromo(code: string, basePrice: number): PromoValidationResult {
    const normalized = code.trim().toUpperCase();
    const promo = store.getPromoCode(normalized);

    if (!promo) {
      return {
        valid: false,
        code: normalized,
        discountAmount: 0,
        finalPrice: basePrice,
        error: 'Промокод не найден',
      };
    }

    if (promo.currentUses >= promo.maxUses) {
      return {
        valid: false,
        code: normalized,
        discountAmount: 0,
        finalPrice: basePrice,
        error: 'Лимит использований промокода исчерпан',
      };
    }

    const discountAmount = this.calculateDiscount(promo, basePrice);
    const finalPrice = Math.max(0, basePrice - discountAmount);

    return {
      valid: true,
      code: promo.code,
      type: promo.type,
      value: promo.value,
      discountAmount,
      finalPrice,
      remainingUses: promo.maxUses - promo.currentUses,
    };
  }

  /**
   * Atomically reserve and apply promo code under keyed mutex lock.
   * Guarantees maxUses is never exceeded under high concurrent load.
   */
  async applyPromoConcurrently(code: string, basePrice: number): Promise<{ discountAmount: number; finalPrice: number }> {
    const normalized = code.trim().toUpperCase();

    return await store.promoMutex.runExclusive(normalized, async () => {
      const promo = store.getPromoCode(normalized);
      if (!promo) {
        throw new PromoCodeError(`Промокод '${normalized}' не существует`, 'PROMO_NOT_FOUND');
      }

      if (promo.currentUses >= promo.maxUses) {
        throw new PromoCodeError(
          `Лимит использований промокода '${normalized}' (${promo.maxUses}) исчерпан`,
          'PROMO_LIMIT_REACHED'
        );
      }

      promo.currentUses += 1;
      const discountAmount = this.calculateDiscount(promo, basePrice);
      const finalPrice = Math.max(0, basePrice - discountAmount);

      return { discountAmount, finalPrice };
    });
  }
}

export const promoService = new PromoService();
