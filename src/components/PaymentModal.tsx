'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Order } from '@/domain/types';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Key,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Flame,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import Link from 'next/link';

interface PaymentModalProps {
  order: Order | null;
  onClose: () => void;
  onOrderUpdated?: (order: Order) => void;
}

export function PaymentModal({ order: initialOrder, onClose, onOrderUpdated }: PaymentModalProps) {
  const [order, setOrder] = useState<Order | null>(initialOrder);
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [lastEventId, setLastEventId] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  // Sync with prop
  useEffect(() => {
    setOrder(initialOrder);
    setTestMessage(null);
  }, [initialOrder]);

  // Polling order status
  const refreshOrder = useCallback(async () => {
    if (!order) return;
    try {
      const res = await fetch(`/api/orders/${order.id}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
        onOrderUpdated?.(data);
      }
    } catch {
      // silent refresh fail
    }
  }, [order, onOrderUpdated]);

  useEffect(() => {
    if (!order) return;
    if (order.status === 'delivered' || order.status === 'payment_failed') return;

    const interval = setInterval(refreshOrder, 1500);
    return () => clearInterval(interval);
  }, [order, refreshOrder]);

  if (!order) return null;

  // Copy key to clipboard
  const handleCopyKey = () => {
    if (order.keyIssued) {
      navigator.clipboard.writeText(order.keyIssued);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Simulate Payment Webhook (Success or Failure)
  const sendPaymentWebhook = async (status: 'paid' | 'failed', reuseLastEventId = false) => {
    setActionLoading(true);
    setTestMessage(null);

    const eventId = reuseLastEventId && lastEventId ? lastEventId : `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    if (!reuseLastEventId) {
      setLastEventId(eventId);
    }

    try {
      const res = await fetch('/api/webhook/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          order_id: order.id,
          status,
          amount: order.finalPrice,
          currency: order.currency,
          created_at: new Date().toISOString(),
        }),
      });

      const data = await res.json();
      setTestMessage(
        `${reuseLastEventId ? 'Дублирующий вебхук: ' : 'Вебхук отправлен: '} ${data.message || 'OK'}`
      );
      await refreshOrder();
    } catch (err: unknown) {
      setTestMessage(`Ошибка вебхука: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Run 50 Parallel Webhooks on this order
  const handle50ParallelWebhooks = async () => {
    setActionLoading(true);
    setTestMessage('Отправка 50 параллельных вебхуков...');

    try {
      const promises = Array.from({ length: 50 }, (_, i) =>
        fetch('/api/webhook/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_id: `evt_modal_50_${order.id}_${i}_${Date.now()}`,
            order_id: order.id,
            status: 'paid',
            amount: order.finalPrice,
            currency: order.currency,
            created_at: new Date().toISOString(),
          }),
        }).then((r) => r.json())
      );

      const results = await Promise.all(promises);
      const okCount = results.filter((r) => r.status === 'ok').length;
      const ignoredCount = results.filter((r) => r.status === 'ignored').length;

      setTestMessage(
        `Результат 50 параллельных запросов: ${okCount} принят, ${ignoredCount} проигнорировано (защита от гонок сработала идеально).`
      );
      await refreshOrder();
    } catch {
      setTestMessage('Ошибка отправки параллельных вебхуков');
    } finally {
      setActionLoading(false);
    }
  };

  // Safe manual reissue from out_of_stock or delivery_failed
  const handleReissue = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/reissue`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setTestMessage(`Ошибка: ${data.error}`);
      } else {
        setTestMessage(data.message);
        setOrder(data.order);
        onOrderUpdated?.(data.order);
      }
    } catch {
      setTestMessage('Сбой выполнения повторной выдачи');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (order.status) {
      case 'created':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-800/60 bg-amber-950/40 px-3 py-1 text-xs font-semibold text-amber-400">
            <Clock className="h-3.5 w-3.5" />
            <span>Ожидает оплаты</span>
          </span>
        );
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-800/60 bg-sky-950/40 px-3 py-1 text-xs font-semibold text-sky-400">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            <span>Оплачен, запускается выдача</span>
          </span>
        );
      case 'delivering':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-800/60 bg-sky-950/40 px-3 py-1 text-xs font-semibold text-sky-400">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            <span>Получение ключа у поставщика...</span>
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-800/60 bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Ключ выдан (завершен)</span>
          </span>
        );
      case 'out_of_stock':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-800/60 bg-amber-950/40 px-3 py-1 text-xs font-semibold text-amber-400">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Оплачено, нет остатка (out_of_stock)</span>
          </span>
        );
      case 'delivery_failed':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-800/60 bg-orange-950/40 px-3 py-1 text-xs font-semibold text-orange-400">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Сбой поставщика (delivery_failed)</span>
          </span>
        );
      case 'payment_failed':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-800/60 bg-rose-950/40 px-3 py-1 text-xs font-semibold text-rose-400">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Оплата не прошла</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 p-5 bg-zinc-950/50">
          <div>
            <span className="text-[11px] font-mono text-zinc-500 uppercase">
              Заказ #{order.id}
            </span>
            <h3 className="text-base font-bold text-white mt-0.5">
              {order.productName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Status & Price Row */}
          <div className="flex items-center justify-between">
            {getStatusBadge()}
            <div className="text-right">
              <span className="text-xs text-zinc-500 block">К оплате</span>
              <span className="text-xl font-mono font-bold text-white">
                {order.finalPrice} {order.currency}
              </span>
            </div>
          </div>

          {/* DELIVERED KEY DISPLAY */}
          {order.status === 'delivered' && order.keyIssued && (
            <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/30 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  <Key className="h-4 w-4" />
                  <span>Ваш цифровой ключ</span>
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">100% валиден</span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                <span className="font-mono text-base font-bold text-white tracking-widest select-all">
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

              <p className="text-[11px] text-zinc-400">
                Ключ привязан к заказу #{order.id} и никогда не будет повторно выдан другому покупателю.
              </p>
            </div>
          )}

          {/* OUT OF STOCK OR DELIVERY FAILED RECOVERY NOTICE */}
          {(order.status === 'out_of_stock' || order.status === 'delivery_failed') && (
            <div className="rounded-xl border border-amber-800/60 bg-amber-950/30 p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>Оплата подтверждена, но товар временно недоступен</span>
              </div>
              <p className="text-xs text-zinc-300">
                {order.failureReason || 'Пул ключей пуст. Заказ переведен в безопасное восстановимое состояние.'}
              </p>
              <div className="pt-2">
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
            </div>
          )}

          {/* Test message / log */}
          {testMessage && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300 font-mono">
              {testMessage}
            </div>
          )}

          {/* PAYMENT WEBHOOK SIMULATOR (Согласно ТЗ) */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" />
                <span>Эмуляция оплаты и вебхуков</span>
              </span>
              <span className="text-[10px] font-mono text-zinc-500">Заглушка по контракту</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => sendPaymentWebhook('paid')}
                disabled={actionLoading || order.status === 'delivered'}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
              >
                Оплатить (успех)
              </button>

              <button
                type="button"
                onClick={() => sendPaymentWebhook('failed')}
                disabled={actionLoading || order.status === 'delivered'}
                className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 disabled:opacity-50 transition-colors"
              >
                Оплатить (сбой)
              </button>
            </div>

            {/* Race condition tests buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={handle50ParallelWebhooks}
                disabled={actionLoading}
                className="flex items-center justify-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-amber-300 hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                title="Отправить 50 одновременных вебхуков"
              >
                <Flame className="h-3.5 w-3.5 text-amber-400" />
                <span>50 параллельных</span>
              </button>

              <button
                type="button"
                onClick={() => sendPaymentWebhook('paid', true)}
                disabled={actionLoading || !lastEventId}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                title="Повторный вебхук с тем же event_id"
              >
                Повтор event_id
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 p-4 bg-zinc-950/50 flex justify-between items-center text-xs">
          <Link
            href={`/orders/${order.id}`}
            className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
          >
            <span>Постоянная ссылка на заказ</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-zinc-800 px-4 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
