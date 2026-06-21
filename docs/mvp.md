# Технический дизайн MVP «Revalio» на Sui

> Источник: исходный документ `Технический дизайн MVP «Revalio» на Sui.docx`.
> Этот файл — рабочая копия в репозитории (единый источник правды для разработки).

## Исполнительное резюме

«Revalio» для экосистемы Sui — лёгкий портфельный трекер и панель аналитики.
Пользователь вставляет адрес Sui и получает балансы, пулы ликвидности, позиции в
кредитовании/стейкинге, график динамики портфеля и ленту активности.

Ядро решения — индексер, который через streaming gRPC с узла Sui (с резервом на
архивные чекпоинты в GCS) сохраняет события транзакций и изменения объектов в БД.
Бэкенд (Node.js/TypeScript) обслуживает API, объединяет данные из БД и ценовых
фидов (Pyth/Coingecko) и отдаёт JSON фронтенду (React/Vue).

### Главные аспекты

- **Индексирование:** официальный `sui-indexer-alt-framework` (sequential pipeline,
  подписка на Checkpoint через gRPC). При отставании/старте с нуля — догрузка из GCS.
- **База данных:** PostgreSQL/TimescaleDB для основных данных; ClickHouse — для
  аналитики по истории (позже).
- **Фиды цен:** Pyth (SUI/USD и основные активы) + резерв (Coingecko/CEX) с TWAP.
- **Парсинг позиций:** декодирование Move-модулей протоколов (Cetus, Suilend и др.),
  расширяемые «парсеры» с тестами.
- **Обновление балансов:** инкрементальное на каждом чекпоинте + периодический reconcile.
- **UX/UI:** страница «Кошелёк» (сводный баланс, активы, DeFi-позиции, история),
  страницы протоколов. TTI ≤ 2с, TTFB ≈ 0.5с.
- **Дорожная карта:** v0 — базовый трекер; v1 — умная аналитика/API; v2 — соц. слой.
- **Интеграции:** 6–10 протоколов (Cetus, DeepBook, Suilend, Scallop, NAVI, Turbos,
  Haedal, SuiNS и др.).
- **Стек:** индексер на Rust + PostgreSQL; API на Node.js/TypeScript; фронтенд React/Vue.
- **Безопасность:** валидация адресов, rate-limit, кеширование, защита от DoS.
- **Тестирование:** unit/integration тесты, нагрузочное (k6), staging/canary.

## 1. Стратегия индексирования

- Streaming gRPC подписка на чекпоинты (`SubscribeCheckpoints`) для реального времени.
- Историю/пропуски догружать из архива Sui в GCS.
- `sui-indexer-alt-framework` (Rust): sequential pipeline для MVP (проще debug, достаточно
  производителен). Concurrent — при росте нагрузки (watermark system).
- Sui финализирует чекпоинты → реоргов нет; sequential pipeline фиксирует чекпоинт целиком.
- Резюме после сбоя — с последнего `checkpoint_hi_inclusive`.

## 2. Модель данных

Основные таблицы: `coins`, `objects`, `coin_objects`, `balances`, `positions`,
`transactions`, `price_ticks`, `protocol_stats`.

Решения для реализации (уточнения к исходному документу):
- Адреса/object_id/digest хранятся как `TEXT` (0x-hex) для удобства MVP.
- `coin_objects` выделены отдельно от общей таблицы `objects`.
- График портфеля строится из снимков (`balance_snapshots`, Sprint 5), а не из «текущих» балансов.

## 3. Ценовые фиды

- Pyth Network (pull-модель через Hermes) — основной источник.
- Coingecko — fallback. DEX-цены — опционально.
- TWAP/усреднение для графика; неликвид/NFT — помечать/исключать.

## 4. Декодирование позиций DeFi

- Плагин-архитектура `ProtocolParser` (по `package_id`, с учётом upgrade пакетов).
- BCS-десериализация структур/событий Move (на Sui нет EVM-ABI).
- Cetus (LP CLMM), Suilend/Scallop/NAVI (lending), Haedal (staking), DeepBook v3.
- Тесты на реальных тестнет/мейннет транзакциях.

## 5. Обновление балансов

- Инкрементальные дельты из effects каждого чекпоинта → UPSERT в `balances`.
- `balance_snapshots` для графика.
- Периодический full-scan reconcile для проверки консистентности.

## 6. UX

- Страница «Кошелёк»: ввод адреса, общий баланс, разбивка по токенам, DeFi-позиции,
  график, лента активности; состояния loading/error/empty.
- Страница протокола: TVL, объёмы, действия, «ваши позиции».

## 7. Дорожная карта

- **v0 (MVP / grant):** балансы, LP/кредитные позиции, лента, график, публичный GET API.
- **v1 (post-grant):** DeepBook open orders + trade history — см. [`deepbook-post-mvp.md`](./deepbook-post-mvp.md).
- **v1+:** аналитика, метки кошельков, Smart Money, API с ключами.
- **v2:** соц. слой, мобильное приложение, white-label виджеты.

## 8. Протоколы

**MVP (grant scope):** Cetus, Suilend, Scallop, NAVI, Turbos, Haedal, …

**После гранта:** DeepBook v3 (open orders → history → trader profile). Детали: [`deepbook-post-mvp.md`](./deepbook-post-mvp.md).

## 9. Стек

- Индексер: Rust (`sui-indexer-alt-framework`).
- Бэкенд: Node.js/TypeScript (Fastify).
- БД: PostgreSQL (+ TimescaleDB; ClickHouse позже).
- Фронтенд: React + Vite.
- Инфра: Docker/K8s, Prometheus/Grafana, CI/CD.

## 10. API (v1)

- `GET /api/v1/wallets/{address}`
- `GET /api/v1/wallets/{address}/balances`
- `GET /api/v1/wallets/{address}/positions`
- `GET /api/v1/wallets/{address}/activity`
- `GET /api/v1/portfolio/chart?address=...&span=...`
- `GET /api/v1/protocols/{protocol_id}`
- `GET /api/v1/protocols/{protocol_id}/positions?address=...`
- `GET /api/v1/search?q=...`
- `GET /api/v1/prices?symbols=...`

## 11. Безопасность

Rate-limit, валидация адресов, CORS, TLS, без PII, публичные данные.

## 12. Тестирование и деплой

CI/CD (GitHub Actions), Docker, unit/integration/data-тесты, k6, миграции, canary/staging.

---

## Замечания по дизайну (ревью)

1. На Sui нет EVM-ABI — парсеры строятся на BCS-десериализации структур/событий пакета.
2. Парсеры должны учитывать апгрейды пакетов (множество `package_id`).
3. График портфеля — отдельные снимки, не «текущие» балансы.
4. Перепроверить таймлайн депрекейта JSON-RPC у Mysten перед публикацией.
5. `coin_objects` отдельно от `objects`.
6. CLMM LP-оценка нетривиальна; на MVP — underlying amounts по текущей цене.
7. DeepBook v3 — **после MVP/гранта**, не в grant scope; архитектурные заготовки — см. `deepbook-post-mvp.md`.
8. Pyth — pull-модель: цену надо тянуть самим через Hermes.
9. Circuit breaker / degraded-mode при лаге фидов/gRPC.
10. Под mainnet история быстро растёт — заранее заложить отдельный store для истории.
