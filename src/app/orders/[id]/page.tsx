'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Order } from '@/domain/types';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Key,
  Copy,
  Check,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Flame,
} from 'lucide-react';
import Link from 'next/link';

export default function OrderStatusPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionLog, setActionLog] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) {
        throw new Error('Заказ не найден');
      }
      const data = await res.json();
      setOrder(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 2000);
    return () => clearInterval(interval);
  }, [fetchOrder]);

  const handleCopyKey = () => {
    if (order?.keyIssued) {
      navigator.clipboard.writeText(order.keyIssued);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const sendPayment = async (status: 'paid' | 'failed') => {
    if (!order) return;
    setActionLoading(true);
    setActionLog(null);
    try {
      const res = await fetch('/api/webhook/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: `evt_page_${Date.now()}`,
          order_id: order.id,
          status,
          amount: order.finalPrice,
          currency: order.currency,
          created_at: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      setActionLog(data.message || 'Вебхук отправлен');
      await fetchOrder();
    } catch {
      setActionLog('Сбой отправки вебхука');
    } finally {
      setActionLoading(false);
    }
  };

  const handle50Webhooks = async () => {
    if (!order) return;
    setActionLoading(true);
    setActionLog('Отправка 50 одновременных вебхуков...');
    try {
      const promises = Array.from({ length: 50 }, (_, i) =>
        fetch('/api/webhook/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_id: `evt_page_50_${order.id}_${i}`,
            order_id: order.id,
            status: 'paid',
            amount: order.finalPrice,
            currency: order.currency,
            created_at: new Date().toISOString(),
          }),
        }).then((r) => r.json())
      );
      const results = await Promise.all(promises);
      const ok = results.filter((r) => r.status === 'ok').length;
      const ignored = results.filter((r) => r.status === 'ignored').length;
      setActionLog(`50 параллельных: ${ok} принят, ${ignored} отклонены как дубли.`);
      await fetchOrder();
    } catch {
      setActionLog('Ошибка теста 50 вебхуков');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReissue = async () => {
    if (!order) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/reissue`, { method: 'POST' });
      const data = await res.json();
      setActionLog(data.message || data.error);
      await fetchOrder();
    } catch {
      setActionLog('Сбой повторной выдачи');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
        <RefreshCw className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="h-10 w-10 text-rose-500 mb-3" />
        <h2 className="text-lg font-bold text-white mb-2">Заказ не найден</h2>
        <p className="text-xs text-zinc-500 mb-4">{error || 'Проверьте корректность идентификатора'}</p>
        <Link
          href="/"
          className="rounded-lg bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors"
        >
          Вернуться на витрину
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Назад на витрину</span>
          </Link>

          <span className="font-mono text-xs text-zinc-500">
            {order.id}
          </span>
        </div>

        {/* Order Main Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
            <div>
              <span className="text-[11px] font-mono text-zinc-500 uppercase">
                Детали заказа
              </span>
              <h1 className="text-xl font-bold text-white mt-1">
                {order.productName}
              </h1>
              {order.steamLogin && (
                <p className="text-xs text-zinc-400 mt-1 font-mono">
                  Логин Steam: {order.steamLogin}
                </p>
              )}
            </div>

            <div className="text-right">
              <span className="text-xs text-zinc-500 block">Сумма заказа</span>
              <span className="text-2xl font-mono font-extrabold text-white">
                {order.finalPrice} {order.currency}
              </span>
              {order.discountAmount > 0 && (
                <span className="text-xs text-emerald-400 block">
                  Скидка: {order.discountAmount} {order.currency} ({order.promoCode})
                </span>
              )}
            </div>
          </div>

          {/* Status Display */}
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Текущий статус
            </span>
            <div className="flex items-center gap-3">
              <span
                className={`font-mono text-xs font-bold px-3 py-1 rounded-full border uppercase ${
                  order.status === 'delivered'
                    ? 'border-emerald-800/80 bg-emerald-950/40 text-emerald-400'
                    : order.status === 'out_of_stock' || order.status === 'delivery_failed'
                    ? 'border-amber-800/80 bg-amber-950/40 text-amber-400'
                    : order.status === 'payment_failed'
                    ? 'border-rose-800/80 bg-rose-950/40 text-rose-400'
                    : 'border-sky-800/80 bg-sky-950/40 text-sky-400'
                }`}
              >
                {order.status}
              </span>
              <span className="text-xs text-zinc-400">
                {order.status === 'delivered' && 'Ключ успешно выдан'}
                {order.status === 'created' && 'Ожидает эмуляции оплаты'}
                {order.status === 'paid' && 'Оплачено, выполняется выдача'}
                {order.status === 'delivering' && 'Связь с поставщиком...'}
                {order.status === 'out_of_stock' && 'Оплачено, нет остатка (восстановимо)'}
                {order.status === 'delivery_failed' && 'Сбой поставщика (восстановимо)'}
                {order.status === 'payment_failed' && 'Оплата отклонена'}
              </span>
            </div>
          </div>

          {/* Delivered Key Box */}
          {order.status === 'delivered' && order.keyIssued && (
            <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/30 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  <Key className="h-4 w-4" />
                  <span>Цифровой ключ активации</span>
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">Выдан ровно 1 раз</span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                <span className="font-mono text-lg font-bold text-white tracking-widest select-all">
                  {order.keyIssued}
                </span>
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="flex items-center gap-1.5 rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Скопировано!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Копировать</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Out of Stock Reissue Box */}
          {(order.status === 'out_of_stock' || order.status === 'delivery_failed') && (
            <div className="rounded-xl border border-amber-800/60 bg-amber-950/30 p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Восстановимое состояние: {order.failureReason}</span>
              </div>
              <button
                type="button"
                onClick={handleReissue}
                disabled={actionLoading}
                className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-400 disabled:opacity-50 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Повторить выдачу (Reissue)</span>
              </button>
            </div>
          )}

          {actionLog && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300 font-mono">
              {actionLog}
            </div>
          )}

          {/* Simulation Controls */}
          <div className="pt-4 border-t border-zinc-800 space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" />
              <span>Эмуляция оплаты для этого заказа</span>
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => sendPayment('paid')}
                disabled={actionLoading || order.status === 'delivered'}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
              >
                Вебхук: paid
              </button>

              <button
                type="button"
                onClick={() => sendPayment('failed')}
                disabled={actionLoading || order.status === 'delivered'}
                className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 disabled:opacity-50 transition-colors"
              >
                Вебхук: failed
              </button>
            </div>

            <button
              type="button"
              onClick={handle50Webhooks}
              disabled={actionLoading}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-medium text-amber-300 hover:bg-zinc-900 disabled:opacity-50 transition-colors"
            >
              <Flame className="h-3.5 w-3.5 text-amber-400" />
              <span>Запустить 50 одновременных вебхуков по этому заказу</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
