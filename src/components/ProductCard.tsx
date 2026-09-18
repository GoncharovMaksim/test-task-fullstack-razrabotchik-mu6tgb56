'use client';

import React, { useState } from 'react';
import { Product, Order } from '@/domain/types';
import { ShoppingCart, Key, Sparkles, Loader2, ArrowRight } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onOrderCreated: (order: Order) => void;
}

export function ProductCard({ product, onOrderCreated }: ProductCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBuy = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: product.sku,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Ошибка создания заказа');
      }

      onOrderCreated(data);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Сбой при покупке');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBadge = (type: Product['type']) => {
    switch (type) {
      case 'key':
        return { label: 'Ключ', bg: 'bg-amber-950/40 border-amber-800/50 text-amber-400' };
      case 'topup':
        return { label: 'Пополнение', bg: 'bg-emerald-950/40 border-emerald-800/50 text-emerald-400' };
      case 'subscription':
        return { label: 'Подписка', bg: 'bg-indigo-950/40 border-indigo-800/50 text-indigo-400' };
      case 'giftcard':
        return { label: 'Карта', bg: 'bg-sky-950/40 border-sky-800/50 text-sky-400' };
    }
  };

  const badge = getBadge(product.type);

  return (
    <div className="group relative flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:bg-zinc-900 hover:shadow-xl hover:shadow-black/50">
      <div className="space-y-3">
        {/* Type badge and Category */}
        <div className="flex items-center justify-between">
          <span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium font-mono ${badge.bg}`}>
            {badge.label}
          </span>
          <span className="text-[11px] text-zinc-500">{product.category}</span>
        </div>

        {/* Thumbnail Placeholder */}
        <div className="relative flex h-28 w-full items-center justify-center rounded-lg border border-zinc-800/80 bg-zinc-950/60 overflow-hidden group-hover:border-zinc-700/60 transition-colors">
          <div className="flex flex-col items-center gap-1 text-zinc-600 group-hover:text-zinc-400 transition-colors">
            <Key className="h-7 w-7" />
            <span className="text-[10px] font-mono tracking-wider uppercase text-zinc-500">{product.sku}</span>
          </div>
        </div>

        {/* Product Title */}
        <div>
          <h4 className="text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors line-clamp-1">
            {product.name}
          </h4>
          <p className="mt-1 text-xs text-zinc-500 font-mono">
            Мгновенная доставка
          </p>
        </div>
      </div>

      {/* Footer: Price & Buy Button */}
      <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-[10px] text-zinc-500">Цена</span>
          <span className="text-base font-bold text-white font-mono">
            {product.price} ₽
          </span>
        </div>

        <button
          type="button"
          onClick={handleBuy}
          disabled={isSubmitting}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3.5 py-2 text-xs font-bold text-zinc-900 hover:bg-white active:scale-95 disabled:opacity-50 transition-all shadow-sm"
        >
          {isSubmitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <span>Купить</span>
              <ArrowRight className="h-3 w-3" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
