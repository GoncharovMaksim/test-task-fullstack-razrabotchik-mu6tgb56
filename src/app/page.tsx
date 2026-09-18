'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { BannerCarousel } from '@/components/BannerCarousel';
import { ServiceIcons } from '@/components/ServiceIcons';
import { SteamTopupBlock } from '@/components/SteamTopupBlock';
import { ProductCard } from '@/components/ProductCard';
import { PaymentModal } from '@/components/PaymentModal';
import { ConcurrencyRunnerModal } from '@/components/ConcurrencyRunnerModal';
import { Product, Order } from '@/domain/types';
import productsData from '@/data/products.json';
import { Sparkles, ShieldAlert, CheckCircle, Info } from 'lucide-react';

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>(productsData as Product[]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Все');
  const [activeService, setActiveService] = useState<string>('');
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [showTestRunner, setShowTestRunner] = useState<boolean>(false);

  // Filter products based on selected category or active service
  const filteredProducts = products.filter((p) => {
    if (activeService === 'steam') return p.category === 'Steam';
    if (selectedCategory === 'Все') return true;
    return p.category === selectedCategory;
  });

  const categories = ['Все', 'Игры', 'Steam', 'Подписки', 'Карты'];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <Header
        onOpenTestRunner={() => setShowTestRunner(true)}
      />

      <main className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-10">
        {/* Banner Carousel (Interactive Item 1) */}
        <section aria-label="Промо-баннеры">
          <BannerCarousel onSelectCategory={(cat) => setSelectedCategory(cat)} />
        </section>

        {/* Service Icons Row (Interactive Item 4) */}
        <section aria-label="Сервисы и платформы">
          <ServiceIcons
            activeService={activeService}
            onSelectService={(serviceId) => {
              setActiveService(serviceId);
              if (serviceId === 'steam') setSelectedCategory('Steam');
              else setSelectedCategory('Все');
            }}
          />
        </section>

        {/* Steam Top-Up Block (Interactive Item 3) */}
        <section aria-label="Пополнение Steam">
          <SteamTopupBlock
            onOrderCreated={(newOrder) => setCurrentOrder(newOrder)}
          />
        </section>

        {/* Catalog Showcase (Interactive Item 5) */}
        <section aria-label="Каталог цифровых товаров" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>Каталог товаров</span>
                <span className="text-xs text-zinc-500 font-normal">
                  ({filteredProducts.length} позиций)
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Ключи активации, подписки и подарочные карты с автоматической выдачей
              </p>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat);
                    setActiveService('');
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat && !activeService
                      ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                      : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid of Product Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.sku}
                product={product}
                onOrderCreated={(order) => setCurrentOrder(order)}
              />
            ))}
          </div>
        </section>

        {/* Resilience Architecture Highlights */}
        <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 space-y-4">
          <div className="flex items-center gap-2 text-zinc-200 text-sm font-semibold">
            <ShieldAlert className="h-4 w-4 text-emerald-400" />
            <span>Архитектурные гарантии системы (Production Ready)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-zinc-400">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5 space-y-1.5">
              <h4 className="font-semibold text-zinc-200">1. Однократная выдача</h4>
              <p>
                Посегментный KeyedMutex и транзакционная изоляция гарантируют, что из 50 параллельных вебхуков ровно один спишет ключ.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5 space-y-1.5">
              <h4 className="font-semibold text-zinc-200">2. Восстановление (out_of_stock)</h4>
              <p>
                При исчерпании пула заказ переходит в восстановимый статус. После пополнения администратором доступна безопасная повторная выдача.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5 space-y-1.5">
              <h4 className="font-semibold text-zinc-200">3. Атомарные промокоды</h4>
              <p>
                Счетчик использований контролируется сервером под замком: лимит N никогда не будет превышен под конкурентными запросами.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Payment & Order Status Modal */}
      {currentOrder && (
        <PaymentModal
          order={currentOrder}
          onClose={() => setCurrentOrder(null)}
          onOrderUpdated={(updated) => setCurrentOrder(updated)}
        />
      )}

      {/* Real-Time Concurrency Test Runner Modal */}
      {showTestRunner && (
        <ConcurrencyRunnerModal onClose={() => setShowTestRunner(false)} />
      )}

      {/* Footer */}
      <footer className="mt-12 border-t border-zinc-800 bg-zinc-950 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-zinc-500">
          <div>
            © 2026 GamerStore. Тестовое задание fullstack-разработчика.
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowTestRunner(true)}
              className="hover:text-zinc-300 transition-colors"
            >
              Запустить проверку гонок
            </button>
            <a href="/admin" className="hover:text-zinc-300 transition-colors">
              Панель администратора
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
