'use client';

import React, { useState } from 'react';
import { CreditCard, CheckCircle2, AlertCircle, ArrowRight, Loader2, Tag } from 'lucide-react';
import { Order } from '@/domain/types';

interface SteamTopupBlockProps {
  onOrderCreated: (order: Order) => void;
}

export function SteamTopupBlock({ onOrderCreated }: SteamTopupBlockProps) {
  // Currency switcher state ($ / ₸ / ₽)
  const [activeCurrency, setActiveCurrency] = useState<'RUB' | 'USD' | 'KZT'>('RUB');
  const [steamLogin, setSteamLogin] = useState('');
  const [selectedSku, setSelectedSku] = useState('STEAM-TOPUP-500');
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoDiscount, setPromoDiscount] = useState<{
    code: string;
    discountAmount: number;
    finalPrice: number;
  } | null>(null);
  const [promoError, setPromoError] = useState('');
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const currencies: Array<{ id: 'RUB' | 'USD' | 'KZT'; label: string; symbol: string }> = [
    { id: 'RUB', label: 'Рубли', symbol: '₽' },
    { id: 'USD', label: 'Доллары', symbol: '$' },
    { id: 'KZT', label: 'Тенге', symbol: '₸' },
  ];

  const amounts = [
    { sku: 'STEAM-TOPUP-500', amount: 500, label: '500 ₽' },
    { sku: 'STEAM-TOPUP-1000', amount: 1000, label: '1000 ₽' },
    { sku: 'STEAM-TOPUP-2500', amount: 2500, label: '2500 ₽' },
  ];

  const currentAmountObj = amounts.find((a) => a.sku === selectedSku) || amounts[0];
  const basePrice = currentAmountObj.amount;
  const currentFinalPrice = promoDiscount ? Math.max(0, basePrice - promoDiscount.discountAmount) : basePrice;

  // Validate Promo Code with backend API
  const handleApplyPromo = async () => {
    if (!promoCodeInput.trim()) {
      setPromoError('Введите промокод');
      return;
    }

    setIsValidatingPromo(true);
    setPromoError('');
    setPromoDiscount(null);

    try {
      const res = await fetch('/api/promocodes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promoCodeInput.trim(),
          basePrice,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.valid) {
        setPromoError(data.error || 'Неверный промокод');
      } else {
        setPromoDiscount({
          code: data.code,
          discountAmount: data.discountAmount,
          finalPrice: data.finalPrice,
        });
      }
    } catch {
      setPromoError('Сбой проверки промокода');
    } finally {
      setIsValidatingPromo(false);
    }
  };

  // Submit order
  const handleBuy = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: selectedSku,
          steamLogin: steamLogin.trim() || undefined,
          promoCode: promoDiscount ? promoDiscount.code : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Не удалось создать заказ');
      }

      onOrderCreated(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ошибка при оформлении';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 sm:p-8 shadow-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Пополнение баланса Steam</span>
            <span className="rounded-md bg-emerald-950/70 border border-emerald-800/50 px-2 py-0.5 text-xs font-mono text-emerald-400">
              Авто-выдача
            </span>
          </h3>
          <p className="text-sm text-zinc-400 mt-1">
            Моментальная доставка кода активации или пополнение логина
          </p>
        </div>

        {/* Currency Switcher ($ / ₸ / ₽) */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-950/80 border border-zinc-800 self-start md:self-auto">
          {currencies.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCurrency(c.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeCurrency === c.id
                  ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <span className="font-mono text-sm">{c.symbol}</span>
              <span className="hidden sm:inline">{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleBuy} className="mt-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Steam Login */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Логин Steam (аккаунт)
            </label>
            <input
              type="text"
              value={steamLogin}
              onChange={(e) => setSteamLogin(e.target.value)}
              placeholder="Например: gaben_official"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-zinc-700 focus:bg-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-700 font-mono"
            />
            <p className="text-[11px] text-zinc-500">
              Указывайте именно логин для входа, а не никнейм профиля
            </p>
          </div>

          {/* Amount Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Номинал пополнения
            </label>
            <div className="grid grid-cols-3 gap-2">
              {amounts.map((a) => (
                <button
                  key={a.sku}
                  type="button"
                  onClick={() => {
                    setSelectedSku(a.sku);
                    setPromoDiscount(null); // reset discount for recalculation
                  }}
                  className={`rounded-xl border py-2.5 text-center text-sm font-semibold transition-all ${
                    selectedSku === a.sku
                      ? 'border-emerald-700/80 bg-emerald-950/30 text-emerald-300 ring-1 ring-emerald-600'
                      : 'border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-950'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Promo Code Input */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <Tag className="h-3.5 w-3.5 text-zinc-400" />
              <span>Промокод на скидку (Этап 4)</span>
            </label>
            <span className="text-[11px] text-zinc-500">
              Тестовые: <span className="font-mono text-zinc-400">WELCOME10</span>, <span className="font-mono text-zinc-400">LIMIT3</span>, <span className="font-mono text-zinc-400">GG500</span>
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={promoCodeInput}
              onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
              placeholder="Введите промокод..."
              className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 uppercase font-mono focus:border-zinc-700 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleApplyPromo}
              disabled={isValidatingPromo || !promoCodeInput.trim()}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 hover:text-white disabled:opacity-50 transition-colors"
            >
              {isValidatingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Применить'}
            </button>
          </div>

          {promoDiscount && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 rounded-lg p-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                Промокод <strong>{promoDiscount.code}</strong> применен! Скидка: <strong>{promoDiscount.discountAmount} ₽</strong>
              </span>
            </div>
          )}

          {promoError && (
            <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/40 border border-rose-900/50 rounded-lg p-2.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{promoError}</span>
            </div>
          )}
        </div>

        {/* Pricing Summary & Buy Button */}
        {formError && (
          <div className="rounded-lg bg-rose-950/50 border border-rose-800/80 p-3 text-xs text-rose-300">
            {formError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div className="space-y-0.5">
            <span className="text-xs text-zinc-500">Итого к оплате:</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-white">
                {currentFinalPrice} ₽
              </span>
              {promoDiscount && promoDiscount.discountAmount > 0 && (
                <span className="text-sm text-zinc-500 line-through">
                  {basePrice} ₽
                </span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-zinc-950 hover:bg-emerald-400 active:scale-98 transition-all shadow-lg shadow-emerald-950/40 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Создание заказа...</span>
              </>
            ) : (
              <>
                <span>Купить</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
