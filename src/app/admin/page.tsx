'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ShieldCheck,
  Package,
  RotateCcw,
  RefreshCw,
  Plus,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
} from 'lucide-react';
import { Order, KeyItem, SupplierConfig, PromoCode } from '@/domain/types';
import { ConcurrencyRunnerModal } from '@/components/ConcurrencyRunnerModal';

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [poolInfo, setPoolInfo] = useState<{
    availableCount: number;
    assignedCount: number;
    totalCount: number;
    keys: KeyItem[];
  } | null>(null);
  const [supplierConfig, setSupplierConfig] = useState<SupplierConfig | null>(null);
  const [restockInput, setRestockInput] = useState('');
  const [restockMessage, setRestockMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showTestRunner, setShowTestRunner] = useState(false);

  // Fetch orders
  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch(`/api/orders?status=${filter}`);
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {
      // silent
    } finally {
      setLoadingOrders(false);
    }
  }, [filter]);

  // Fetch pool
  const loadPool = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/pool');
      const data = await res.json();
      setPoolInfo(data);
    } catch {
      // silent
    }
  }, []);

  // Fetch supplier config
  const loadSupplierConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/supplier');
      const data = await res.json();
      setSupplierConfig(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadOrders();
    loadPool();
    loadSupplierConfig();
  }, [loadOrders, loadPool, loadSupplierConfig]);

  // Reissue order
  const handleReissue = async (orderId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/reissue`, { method: 'POST' });
      const data = await res.json();
      alert(data.message || (data.error ? `Ошибка: ${data.error}` : 'Готово'));
      await loadOrders();
      await loadPool();
    } catch {
      alert('Сбой запроса на повторную выдачу');
    } finally {
      setActionLoading(false);
    }
  };

  // Restock keys
  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockInput.trim()) return;

    const newKeys = restockInput
      .split('\n')
      .map((k) => k.trim())
      .filter(Boolean);

    if (newKeys.length === 0) return;

    try {
      const res = await fetch('/api/admin/pool/restock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: newKeys }),
      });
      const data = await res.json();
      setRestockMessage(data.message);
      setRestockInput('');
      await loadPool();
    } catch {
      setRestockMessage('Ошибка пополнения пула');
    }
  };

  // Update supplier config
  const handleUpdateSupplier = async (updated: Partial<SupplierConfig>) => {
    try {
      const res = await fetch('/api/admin/supplier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (data.config) setSupplierConfig(data.config);
    } catch {
      // silent
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div className="space-y-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors mb-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Вернуться в магазин</span>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
              <span>Панель управления и сбоев (Этап 3)</span>
            </h1>
            <p className="text-xs text-zinc-400">
              Мониторинг заказов, безопасная повторная выдача (reissue), управление остатками и симуляция поставщиков
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowTestRunner(true)}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-800/80 bg-emerald-950/40 px-3.5 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-900/50 transition-colors"
            >
              <Zap className="h-4 w-4" />
              <span>Запустить тесты гонок</span>
            </button>

            <button
              type="button"
              onClick={() => {
                loadOrders();
                loadPool();
              }}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Обновить</span>
            </button>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Доступно ключей в пуле
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white font-mono">
                {poolInfo ? poolInfo.availableCount : '...'}
              </span>
              <span className="text-xs text-zinc-500">
                / {poolInfo ? poolInfo.totalCount : '...'} всего
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Выдано заказов
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-emerald-400 font-mono">
                {poolInfo ? poolInfo.assignedCount : '...'}
              </span>
              <span className="text-xs text-zinc-500">уникальных ключей</span>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Требуют внимания (Этап 3)
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-amber-400 font-mono">
                {orders.filter((o) => o.status === 'out_of_stock' || o.status === 'delivery_failed').length}
              </span>
              <span className="text-xs text-zinc-500">оплачен, но не выдан</span>
            </div>
          </div>
        </div>

        {/* Orders Management Table */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white">Список заказов</h2>
              <p className="text-xs text-zinc-400">
                Фильтрация по статусам и ручная повторная выдача
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 bg-zinc-950/70 border border-zinc-800 p-1 rounded-xl">
              {[
                { id: 'all', label: 'Все заказы' },
                { id: 'unfulfilled', label: 'Оплачен, не выдан' },
                { id: 'delivered', label: 'Выдано' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    filter === f.id
                      ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-zinc-700'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-3">ID заказа</th>
                  <th className="py-3 px-3">Товар</th>
                  <th className="py-3 px-3">Цена</th>
                  <th className="py-3 px-3">Статус</th>
                  <th className="py-3 px-3">Выданный ключ</th>
                  <th className="py-3 px-3 text-right">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500 font-sans">
                      Заказов в выбранной категории не найдено
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3 px-3 text-white font-bold">{o.id}</td>
                      <td className="py-3 px-3 font-sans text-zinc-200">{o.productName}</td>
                      <td className="py-3 px-3">{o.finalPrice} {o.currency}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            o.status === 'delivered'
                              ? 'border-emerald-800/60 bg-emerald-950/40 text-emerald-400'
                              : o.status === 'out_of_stock' || o.status === 'delivery_failed'
                              ? 'border-amber-800/60 bg-amber-950/40 text-amber-400'
                              : 'border-zinc-700 bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-zinc-400">
                        {o.keyIssued ? (
                          <span className="text-emerald-400">{o.keyIssued}</span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-sans">
                        {(o.status === 'out_of_stock' || o.status === 'delivery_failed' || o.status === 'paid') && (
                          <button
                            type="button"
                            onClick={() => handleReissue(o.id)}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1 rounded bg-amber-500 px-2.5 py-1 text-xs font-bold text-zinc-950 hover:bg-amber-400 transition-colors"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>Повторить выдачу</span>
                          </button>
                        )}
                        {o.status === 'delivered' && (
                          <button
                            type="button"
                            onClick={() => handleReissue(o.id)}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] font-medium text-zinc-400 hover:text-white transition-colors"
                            title="Проверка идемпотентности: повторная выдача не должна списать новый ключ"
                          >
                            Идемпотентный reissue
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lower Row: Pool Restock & Supplier Fault Injection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Restock Keys */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 space-y-4">
            <div className="flex items-center gap-2 text-white font-bold">
              <Package className="h-5 w-5 text-emerald-400" />
              <h3>Пополнение пула ключей</h3>
            </div>
            <p className="text-xs text-zinc-400">
              Добавьте новые ключи (по одному на строку) для возобновления выдачи после out_of_stock
            </p>

            <form onSubmit={handleRestock} className="space-y-3">
              <textarea
                value={restockInput}
                onChange={(e) => setRestockInput(e.target.value)}
                placeholder="RESTOCK-KEY-0001&#10;RESTOCK-KEY-0002"
                rows={3}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-white placeholder-zinc-500 font-mono focus:border-zinc-700 focus:outline-none"
              />

              {restockMessage && (
                <div className="text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-900/40 p-2.5 rounded-lg">
                  {restockMessage}
                </div>
              )}

              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-4 py-2 text-xs font-bold text-zinc-900 hover:bg-white transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Пополнить пул</span>
              </button>
            </form>
          </div>

          {/* Supplier Simulation Settings */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 space-y-4">
            <div className="flex items-center gap-2 text-white font-bold">
              <Sliders className="h-5 w-5 text-sky-400" />
              <h3>Симуляция сбоев поставщиков (Этап 3)</h3>
            </div>
            <p className="text-xs text-zinc-400">
              Поставщик A (основной) и Поставщик B (резервный fallback). Настройка таймаутов и 5xx.
            </p>

            {supplierConfig ? (
              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex justify-between text-zinc-300 mb-1">
                    <span>Поставщик A: Вероятность 5xx ошибки</span>
                    <span className="font-mono font-bold">
                      {Math.round(supplierConfig.supplierAFailRate * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={supplierConfig.supplierAFailRate}
                    onChange={(e) =>
                      handleUpdateSupplier({ supplierAFailRate: parseFloat(e.target.value) })
                    }
                    className="w-full accent-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-zinc-300 mb-1">
                    <span>Поставщик A: Вероятность таймаута</span>
                    <span className="font-mono font-bold">
                      {Math.round(supplierConfig.supplierATimeoutRate * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={supplierConfig.supplierATimeoutRate}
                    onChange={(e) =>
                      handleUpdateSupplier({ supplierATimeoutRate: parseFloat(e.target.value) })
                    }
                    className="w-full accent-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-zinc-300 mb-1">
                    <span>Поставщик B (резерв): Вероятность 5xx ошибки</span>
                    <span className="font-mono font-bold">
                      {Math.round(supplierConfig.supplierBFailRate * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={supplierConfig.supplierBFailRate}
                    onChange={(e) =>
                      handleUpdateSupplier({ supplierBFailRate: parseFloat(e.target.value) })
                    }
                    className="w-full accent-emerald-500"
                  />
                </div>
              </div>
            ) : (
              <div className="text-zinc-500 text-xs">Загрузка конфигурации...</div>
            )}
          </div>
        </div>
      </div>

      {showTestRunner && (
        <ConcurrencyRunnerModal onClose={() => setShowTestRunner(false)} />
      )}
    </div>
  );
}
