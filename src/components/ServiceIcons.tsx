'use client';

import React from 'react';
import { Gamepad2, Send, MessageSquare, Tv, Music2, Disc3, ShieldCheck } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  tag: string;
  icon: React.ReactNode;
}

const SERVICES: Service[] = [
  {
    id: 'steam',
    name: 'Steam',
    tag: 'Пополнение & Ключи',
    icon: (
      <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
        <path d="M12 2a10 10 0 0 0-10 9.87c0 4.7 3.27 8.64 7.69 9.68l2.25-3.26a3.5 3.5 0 0 1-1.39-2.79c0-.28.04-.55.1-.81L7.1 13.56a4.8 4.8 0 0 1-2.1.48c-2.65 0-4.8-2.15-4.8-4.8s2.15-4.8 4.8-4.8 4.8 2.15 4.8 4.8c0 .24-.02.47-.06.7l3.32 2.22c.7-.35 1.5-.55 2.34-.55 3.04 0 5.5 2.46 5.5 5.5s-2.46 5.5-5.5 5.5c-1.46 0-2.8-.57-3.79-1.5l-3.35 1.48C9.52 23.44 10.74 24 12 24a12 12 0 1 0 0-24z"/>
      </svg>
    ),
  },
  {
    id: 'telegram',
    name: 'Telegram',
    tag: 'Stars & Premium',
    icon: <Send className="w-6 h-6 text-sky-400" />,
  },
  {
    id: 'roblox',
    name: 'Roblox',
    tag: 'Robux & Cards',
    icon: <Gamepad2 className="w-6 h-6 text-red-400" />,
  },
  {
    id: 'discord',
    name: 'Discord',
    tag: 'Nitro 1M / 1Y',
    icon: <MessageSquare className="w-6 h-6 text-indigo-400" />,
  },
  {
    id: 'playstation',
    name: 'PlayStation',
    tag: 'PSN Пополнение',
    icon: <Disc3 className="w-6 h-6 text-blue-400" />,
  },
  {
    id: 'xbox',
    name: 'Xbox',
    tag: 'Game Pass & Cards',
    icon: <Gamepad2 className="w-6 h-6 text-emerald-400" />,
  },
  {
    id: 'spotify',
    name: 'Spotify',
    tag: 'Premium подписка',
    icon: <Music2 className="w-6 h-6 text-emerald-500" />,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    tag: 'Premium без рекламы',
    icon: <Tv className="w-6 h-6 text-red-500" />,
  },
];

export function ServiceIcons({
  activeService,
  onSelectService,
}: {
  activeService?: string;
  onSelectService?: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Популярные сервисы
        </h3>
        <span className="text-xs text-zinc-500">Плавное наведение & фильтр</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {SERVICES.map((s) => {
          const isSelected = activeService === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectService?.(isSelected ? '' : s.id)}
              className={`group flex flex-col items-center justify-center rounded-xl p-3.5 border transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg ${
                isSelected
                  ? 'border-zinc-500 bg-zinc-800 text-white shadow-md ring-1 ring-zinc-500'
                  : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800/80 hover:text-white'
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800/80 text-zinc-300 group-hover:text-white group-hover:scale-110 transition-transform duration-300">
                {s.icon}
              </div>
              <span className="mt-2 text-xs font-medium text-zinc-200 group-hover:text-white transition-colors">
                {s.name}
              </span>
              <span className="text-[10px] text-zinc-500 truncate max-w-full">
                {s.tag}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
