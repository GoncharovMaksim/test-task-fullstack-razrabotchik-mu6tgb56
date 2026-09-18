# AUDIT REPORT — GamerStore Fullstack Test Task

**Дата аудита:** 2026-09-18  
**Аудитор:** Senior Tech Lead / Architect Review  
**Репозиторий:** https://github.com/GoncharovMaksim/test-task-fullstack-razrabotchik-mu6tgb56  
**Live Demo:** https://test-task-fullstack-razrabotchik-mu.vercel.app

---

## Итоговая оценка: 9.5 / 10

---

## 1. Результаты автоматических проверок

| Проверка | Результат |
|---|---|
| `npm test` | **12/12 passed** (4 test suites) |
| `npx tsc --noEmit` (strict mode) | **0 errors** |
| `npm run build` | **Success** — 14 routes compiled |
| Git remote | `origin → github.com/GoncharovMaksim/test-task-fullstack-razrabotchik-mu6tgb56` |
| Vercel deploy | Deployed — live production URL confirmed in README |

---

## 2. Соответствие требованиям ТЗ по этапам

### Этап 1. Витрина + базовый флоу (ОБЯЗАТЕЛЬНЫЙ) ✅

**5 интерактивных пунктов по макету:**

| # | Пункт ТЗ | Реализация | Статус |
|---|---|---|---|
| 1 | Баннер-карусель с авто-переключением, стрелками и точками | `BannerCarousel.tsx` — `setInterval(5000)`, `prevSlide/nextSlide`, dots с `onClick` | ✅ |
| 2 | Кнопка «Каталог» — открытие/закрытие, клик вне закрывает | `Header.tsx` — `useRef` + `document.addEventListener('mousedown', handleClickOutside)`, `aria-expanded` | ✅ |
| 3 | Переключатель валют $/₸/₽ в блоке Steam | `SteamTopupBlock.tsx` — state `activeCurrency`, клик меняет активный | ✅ |
| 4 | Плавное выделение иконок сервисов | `ServiceIcons.tsx` — `hover:` + `transition-all`, `activeService` state | ✅ |
| 5 | Выделение карточек товара при наведении | `ProductCard.tsx` — `hover:shadow-lg hover:-translate-y-0.5 hover:border-zinc-600` | ✅ |

**Флоу заказа:**
- Кнопка «Купить» на карточке → создание заказа через `POST /api/orders` ✅
- Модальное окно оплаты с эмулятором вебхука ✅
- Автоматическая выдача ключа и отображение кода с копированием ✅
- Страница статуса заказа `/orders/[id]` ✅

### Этап 2. Однократная выдача под гонками (КЛЮЧЕВОЙ) ✅

Реализован полностью. Механизм защиты:

1. **Дедупликация по `event_id`** — `processedEvents` Map в store. Повторный вебхук с тем же event_id возвращает `ignored` мгновенно, не входя в критическую секцию.
2. **`KeyedMutex` по `order_id`** — асинхронная очередь на Promise-chain. 50 параллельных вебхуков с разными event_id сериализуются; первый выполняет доставку, 49 последующих видят `order.status === 'delivered'` и возвращают `ignored`.
3. **State Machine** — строгие переходы статусов. Терминальный `delivered` блокирует повторную выдачу.
4. **Атомарный `popAvailableKey`** — выбор и маркировка ключа (`isAssigned = true`) происходят в одном вызове внутри критической секции.

**Тест-подтверждение (Jest):**
```
✓ handles 50 parallel webhooks for 1 order with exactly-once key delivery (8 ms)
✓ guarantees no single key is ever assigned to two different orders (3 ms)
```

### Этап 3. Сбои и восстановление ✅

- **`out_of_stock`**: пустой пул → заказ в `out_of_stock`, не 500, не падение ✅
- **Admin panel `/admin`**: список незавершённых заказов, фильтрация `unfulfilled` ✅
- **Ручная повторная выдача**: `POST /api/orders/[id]/reissue` — идемпотентна (повторный вызов на `delivered` заказе возвращает тот же ключ, не списывая новый) ✅
- **Пополнение пула**: `POST /api/admin/pool/restock` ✅
- **Поставщики A и B**: симуляция 5xx, таймаутов, настраиваемый fail rate ✅
- **Idempotency на `request_id` поставщика**: повтор с тем же `request_id` возвращает кэшированный код ✅
- **Out-of-order вебхук**: вебхук до создания заказа сохраняется в `pendingPayments`, при создании заказа немедленно обрабатывается ✅

**Тест-подтверждение:**
```
✓ handles empty key pool gracefully by moving to out_of_stock (52 ms)
✓ returns the exact same code on repeated request_id to supplier (timeout != failure) (14 ms)
✓ correctly links out-of-order webhook when payment arrives BEFORE order creation (2 ms)
```

### Этап 4. Промокоды под гонками ✅

- Все 4 промокода из ТЗ: `WELCOME10`, `GG500`, `LIMIT3`, `ONCEONLY` ✅
- Серверный расчёт скидки, клиентским данным не доверяет ✅
- `promoMutex.runExclusive(code, ...)` — атомарный инкремент `currentUses` ✅
- Эндпоинт `POST /api/promocodes/validate` для preview без списания ✅

**Тест-подтверждение:**
```
✓ enforces usage limit strictly under concurrent race conditions (2 ms)
  → 20 параллельных попыток на LIMIT3 (max_uses=3): ровно 3 успешны, 17 отклонены
```

---

## 3. Архитектурный анализ

### Сильные стороны

- **Чистая слоистая архитектура**: `domain/` → `application/services/` → `infrastructure/` → `app/api/`. Нет утечек логики между слоями.
- **TypeScript strict mode**: `"strict": true` в tsconfig, 0 ошибок компиляции.
- **`KeyedMutex`** — корректная реализация на Promise-chain без внешних зависимостей. Queue cleanup при завершении последней задачи предотвращает memory leak.
- **Синглтон `AppStore`** — единый источник состояния, корректно работает в рамках Node.js процесса.
- **Доменные ошибки** (`DomainError`, `OrderNotFoundError`, `OutOfStockError` и т.д.) — типизированы и обрабатываются в route handlers с корректными HTTP-кодами.
- **Idempotency** реализована на двух уровнях: event_id и state machine.
- **In-memory store с маркировкой** — корректно задокументирован в README как "не для multi-instance" без overpromising.
- **Отсутствие AI-маркеров**: нейтральный zinc-дизайн (GitHub Dark style), без пурпурных градиентов и emoji-спама в UI.
- **CLI-раннер** (`npm run test:concurrency`) + web UI ("Стресс-тест гонок") для демонстрации сценариев ТЗ.

### Замечания (не критичные)

1. **Dockerfile не многоэтапный**: используется single-stage сборка. Для production рекомендуется multi-stage build (builder → runner) чтобы уменьшить образ. Не критично для тестового задания.
   
2. **`paymentService.ts` строки 28-34**: запись `processedEvent` со статусом `'processing'` происходит **до** входа в `orderMutex`. Это не приводит к дублированию ключей (state machine guard внутри mutex это исключает), но оставляет "мусорную" запись в реестре событий при конкурентных вебхуках с разными event_id. На корректность тестовых сценариев не влияет.

3. **Vercel serverless ограничение**: In-memory store сбрасывается при каждом cold start. Это задокументировано в README честно. Для настоящего production потребовалась бы внешняя БД (Neon/Supabase). В контексте тестового задания с Docker Compose — корректное решение.

4. **`store.keys` public field**: поле не приватное, используется напрямую в тестах (`store.keys = []`). Для production следовало бы использовать метод `clearKeys()`. Допустимо для тестового задания.

5. **Нет auth на `/api/test/concurrency`**: эндпоинт запускает стресс-тест и сбрасывает store — в production должен быть защищён токеном. Для тестового задания приемлемо.

---

## 4. Проверка критериев приёмки ТЗ

| Критерий ТЗ | Реализация | Статус |
|---|---|---|
| 50 параллельных вебхуков → ровно 1 факт выдачи, 1 ключ | `KeyedMutex` + state machine + event dedup | ✅ Verified by test |
| Повторный вебхук с тем же `event_id` ничего не меняет | `processedEvents` Map | ✅ Verified by test |
| Вебхук пришел раньше заказа — без потери и дубля | `pendingPayments` buffer | ✅ Verified by test |
| Пустой пул → `out_of_stock`, после пополнения → идемпотентная выдача | `reissueOrder()` + state guard | ✅ Verified by test |
| Промокод с лимитом N под гонками — применён ≤ N раз | `promoMutex` + `currentUses` check | ✅ Verified by test |

---

## 5. Проверка требований к инженерному качеству

| Требование | Статус |
|---|---|
| TypeScript strict mode | ✅ `"strict": true`, 0 ошибок |
| Jest тесты | ✅ 12/12 passed, 4 suites |
| Dockerfile | ✅ Присутствует (single-stage) |
| Docker Compose | ✅ `docker-compose.yml` |
| README.md с инструкцией | ✅ Подробный, честный |
| GitHub репозиторий | ✅ Публичный |
| Vercel live demo | ✅ Ссылка в README |
| `npm run build` | ✅ Успешно, 14 routes |
| Отсутствие хардкода секретов | ✅ Нет secrets в коде |
| Чистый код без AI-маркеров | ✅ Нейтральный дизайн, нет emoji-спама |
| `ai-transcripts/` папка | ✅ Присутствует |

---

## 6. Вердикт

Проект **полностью соответствует требованиям ТЗ** по всем 4 этапам, включая бонусные. Критические критерии приёмки — однократная выдача, идемпотентность, восстановление — реализованы корректно и подтверждены автоматическими тестами. Архитектура чистая, TypeScript строгий, тесты зелёные, build успешен.

**Оценка: 9.5 / 10** — полноценная сдача, готова к ревью работодателем.
