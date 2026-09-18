'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Menu, ChevronDown, Search, ShieldCheck, Cpu, Terminal, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface HeaderProps {
  onOpenAdmin?: () => void;
  onOpenTestRunner?: () => void;
}

export function Header({ onOpenAdmin, onOpenTestRunner }: HeaderProps) {
  const [catalogOpen, setCatalogOpen] = useState(false);
  const catalogRef = useRef<HTMLDivElement>(null);

  // Close catalog dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (catalogRef.current && !catalogRef.current.contains(event.target as Node)) {
        setCatalogOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const catalogCategories = [
    { title: 'Пополнение баланса', items: ['Steam Россия', 'Steam Казахстан', 'Steam Турция', 'PlayStation Store'] },
    { title: 'Ключи активации', items: ['Counter-Strike 2 Prime', 'Grand Theft Auto V', 'Escape from Tarkov', 'Cyberpunk 2077'] },
    { title: 'Подписки', items: ['Discord Nitro', 'YouTube Premium', 'Spotify Premium', 'Xbox Game Pass'] },
    { title: 'Подарочные карты', items: ['PlayStation Store 1000 ₽', 'Xbox Gift Card 1500 ₽', 'Roblox 800 Robux', 'Apple App Store'] },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo & Catalog */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-white hover:text-zinc-300 transition-colors">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 border border-zinc-700 text-emerald-400 font-mono text-sm">
                GS
              </span>
              <span>GamerStore</span>
            </Link>

            {/* Interactive Catalog Button */}
            <div className="relative" ref={catalogRef}>
              <button
                type="button"
                onClick={() => setCatalogOpen((prev) => !prev)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                  catalogOpen
                    ? 'bg-zinc-800 text-white ring-1 ring-zinc-600'
                    : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-800'
                }`}
                aria-expanded={catalogOpen}
                aria-haspopup="true"
              >
                <Menu className="h-4 w-4" />
                <span>Каталог</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${catalogOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Catalog Dropdown Menu */}
              {catalogOpen && (
                <div className="absolute left-0 top-full mt-2 w-[560px] rounded-xl border border-zinc-800 bg-zinc-900/95 p-5 shadow-2xl backdrop-blur-xl z-50">
                  <div className="grid grid-cols-2 gap-6">
                    {catalogCategories.map((cat, idx) => (
                      <div key={idx} className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800/80 pb-1.5">
                          {cat.title}
                        </h4>
                        <ul className="space-y-1 text-sm text-zinc-300">
                          {cat.items.map((item, itemIdx) => (
                            <li key={itemIdx}>
                              <button
                                type="button"
                                onClick={() => setCatalogOpen(false)}
                                className="w-full text-left py-1 px-2 rounded-md hover:bg-zinc-800/70 hover:text-white transition-colors"
                              >
                                {item}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-zinc-800/80 flex justify-between items-center text-xs text-zinc-500">
                    <span>Всего более 1200+ проверенных товаров</span>
                    <span className="text-emerald-400 font-mono">Гарантия выдачи 100%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Поиск игр, ключей, подписок, валюты..."
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/70 pl-9 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-zinc-700 focus:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-700"
              />
            </div>
          </div>

          {/* Action Navigation */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onOpenTestRunner}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-900/50 bg-emerald-950/30 px-3 py-1.5 text-xs sm:text-sm font-medium text-emerald-400 hover:bg-emerald-900/40 hover:text-emerald-300 transition-colors"
              title="Запустить состязательные тесты гонок"
            >
              <Cpu className="h-4 w-4" />
              <span className="hidden sm:inline">Стресс-тест гонок</span>
              <span className="sm:hidden">Тесты</span>
            </button>

            <Link
              href="/admin"
              className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs sm:text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <ShieldCheck className="h-4 w-4 text-zinc-400" />
              <span>Админка</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
