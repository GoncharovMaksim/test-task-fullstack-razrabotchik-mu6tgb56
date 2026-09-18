import { promoService } from '@/application/services/promoService';
import { store } from '@/infrastructure/store';

describe('PromoService', () => {
  beforeEach(() => {
    store.initDefaultData();
  });

  it('calculates percentage discounts correctly', () => {
    const promo10 = store.getPromoCode('WELCOME10')!;
    const discount = promoService.calculateDiscount(promo10, 1000);
    expect(discount).toBe(100);

    const validation = promoService.validatePromo('WELCOME10', 1000);
    expect(validation.valid).toBe(true);
    expect(validation.discountAmount).toBe(100);
    expect(validation.finalPrice).toBe(900);
  });

  it('calculates fixed amount discounts correctly capped at basePrice', () => {
    const promo500 = store.getPromoCode('GG500')!;
    const discount1 = promoService.calculateDiscount(promo500, 1000);
    expect(discount1).toBe(500);

    const discount2 = promoService.calculateDiscount(promo500, 300);
    expect(discount2).toBe(300); // capped at basePrice
  });

  it('enforces usage limit strictly under concurrent race conditions', async () => {
    // LIMIT3 has max_uses = 3
    const promo = store.getPromoCode('LIMIT3')!;
    expect(promo.maxUses).toBe(3);

    const parallelRequests = 20;
    const attempts = Array.from({ length: parallelRequests }, () =>
      promoService.applyPromoConcurrently('LIMIT3', 1000).then(
        (res) => ({ success: true, res }),
        (err) => ({ success: false, error: err.message })
      )
    );

    const results = await Promise.all(attempts);
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    expect(successCount).toBe(3);
    expect(failureCount).toBe(17);
    expect(store.getPromoCode('LIMIT3')!.currentUses).toBe(3);
  });

  it('rejects exhausted promo code on validation', async () => {
    // ONCEONLY has max_uses = 1
    await promoService.applyPromoConcurrently('ONCEONLY', 1000);

    const validation = promoService.validatePromo('ONCEONLY', 1000);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('исчерпан');
  });
});
