import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GamerStore — Цифровые товары, ключи и пополнение Steam',
  description: 'Магазин цифровых товаров для геймеров с гарантией однократной выдачи и отказоустойчивостью',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="dark">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen antialiased selection:bg-zinc-700 selection:text-white">
        {children}
      </body>
    </html>
  );
}
