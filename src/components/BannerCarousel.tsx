'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Shield, Zap } from 'lucide-react';

interface Slide {
  id: number;
  badge: string;
  title: string;
  subtitle: string;
  buttonText: string;
  category: string;
}

const SLIDES: Slide[] = [
  {
    id: 1,
    badge: 'Специальное предложение',
    title: 'Хиты Steam со скидкой до 50%',
    subtitle: 'CS2 Prime, GTA V, Escape from Tarkov — моментальная выдача ключа сразу после подтверждения оплаты.',
    buttonText: 'Смотреть ключи',
    category: 'Игры',
  },
  {
    id: 2,
    badge: 'Моментальное пополнение',
    title: 'Пополнение баланса Steam от 500 ₽',
    subtitle: 'Без скрытых комиссий. Зачисление на аккаунт региона РФ, СНГ и Казахстан за 1 секунду.',
    buttonText: 'Пополнить баланс',
    category: 'Steam',
  },
  {
    id: 3,
    badge: 'Подписки без границ',
    title: 'Discord Nitro, Spotify & YouTube Premium',
    subtitle: 'Активация на любой аккаунт без смены региона и сложных манипуляций. Гарантия работы.',
    buttonText: 'Выбрать подписку',
    category: 'Подписки',
  },
];

export function BannerCarousel({ onSelectCategory }: { onSelectCategory?: (cat: string) => void }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide]);

  const slide = SLIDES[currentSlide];

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/90 shadow-xl"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative min-h-[220px] sm:min-h-[260px] p-6 sm:p-10 flex flex-col justify-between">
        {/* Slide Content */}
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800/80 px-3 py-1 text-xs font-medium text-zinc-300">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>{slide.badge}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {slide.title}
          </h2>

          <p className="text-sm sm:text-base text-zinc-400 line-clamp-2 sm:line-clamp-none">
            {slide.subtitle}
          </p>
        </div>

        <div className="pt-4 flex items-center gap-4">
          <button
            type="button"
            onClick={() => onSelectCategory?.(slide.category)}
            className="rounded-lg bg-zinc-100 px-4 py-2 text-xs sm:text-sm font-semibold text-zinc-900 hover:bg-white transition-colors"
          >
            {slide.buttonText}
          </button>
        </div>

        {/* Arrow Navigation Controls */}
        <button
          type="button"
          onClick={prevSlide}
          className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-zinc-950/70 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          aria-label="Предыдущий слайд"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={nextSlide}
          className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-zinc-950/70 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          aria-label="Следующий слайд"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Interactive Indicator Dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {SLIDES.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setCurrentSlide(idx)}
              aria-label={`Слайд ${idx + 1}`}
              className={`h-2 rounded-full transition-all duration-200 ${
                currentSlide === idx ? 'w-6 bg-zinc-200' : 'w-2 bg-zinc-700 hover:bg-zinc-500'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
