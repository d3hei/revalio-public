# DeepBook — план после MVP

> **Статус:** не в scope гранта / MVP. Первая большая фича **после** подачи на грант.  
> **Источник правды по чеклисту:** [`ROADMAP.md`](../ROADMAP.md)

## Где DeepBook в общей картине MVP

| Phase | Scope | Статус |
|-------|--------|--------|
| **Phase 1** | Wallet balances, Activity feed, Portfolio chart | ✅ |
| **Phase 2** | Lending — Navi, Scallop | ✅ |
| **Phase 3** | LP — Cetus, Turbos | ✅ (Cetus native; Turbos — по roadmap) |
| **Post-MVP** | **DeepBook** → Smart Money → Walrus | ⏭ |

DeepBook идёт **после** Phase 1–3, **не до**.

## Почему не сейчас

Главная задача MVP — **реальная стоимость портфеля**:

| Обязательно для продукта | Вопрос, на который отвечает |
|--------------------------|-----------------------------|
| Spot balances | «Сколько у меня денег?» |
| Lending positions | «Где мои supply/borrow?» |
| LP positions | «Где моя ликвидность?» |
| **DeepBook** | «**Как** я торгую?» — другой уровень продукта |

Без balances + lending + LP продукт не работает как Revalio. DeepBook не закрывает эту дыру.

## Покрытие пользователей (оценка ROI)

| Модуль | Покрытие кошельков | ROI разработки |
|--------|-------------------|----------------|
| Wallet balances | ~100% | ★★★★★ |
| Lending | ~60–80% | ★★★★☆ |
| LP | ~50–70% | ★★★☆☆ |
| DeepBook | ~5–20% | ★★☆☆☆ |

**Порядок по ROI:** Lending >>> LP >>> DeepBook

## Когда DeepBook становится интересным

После того как есть:

- Portfolio Page  
- Wallet Page  
- Activity Feed  

Тогда логично добавить вкладку **Trading**.

## Roadmap по версиям

### MVP (grant-worthy)

- Balances  
- Activity  
- Portfolio chart  
- Navi, Scallop  
- Cetus, Turbos  

→ Достаточно для подачи на грант **до** DeepBook.

### V1 — DeepBook Open Orders

Пользователь видит:

```
Open Orders
-----------
BUY SUI
SELL DEEP
BUY WAL
```

Относительно простая первая интеграция.

### V1.1 — Trade History

- Recent trades  
- Volume  
- Pairs  

### V1.2 — Trader Profile

- 30D volume  
- Most traded asset  
- Number of trades  

### V2 — Smart Money Layer

- Top traders  
- Whale traders  
- Most active wallets  

### V3 — Walrus

- Historical trader reports (после появления Walrus в экосистеме)

## Когда подаваться на грант

**До DeepBook.**

Для гранта важнее:

- ✓ Real wallet tracking  
- ✓ Lending support  
- ✓ LP support  
- ✓ Activity feed  

чем:

- ✗ Open orders на DEX  

## Два сценария приоритетов

### Цель: грант максимально быстро

1. Wallet balances  
2. Activity feed  
3. Navi  
4. Scallop  
5. Cetus  
6. Turbos  
7. **Подать на грант**  
8. DeepBook  
9. Smart Money  
10. Walrus  

### Цель: сильнейший продукт на Sui

```
MVP → Grant → DeepBook → Smart Money → Walrus → Sui Intelligence Platform
```

DeepBook — не часть MVP, а **первая крупная фича после MVP и после гранта**.

## Архитектурная подготовка (уже сейчас)

Чтобы позже DeepBook был «ещё один адаптер», а не рефакторинг:

### Positions (`apps/api/src/lib/positions/`)

- `PositionKind`: `spot | staking | lending | lp | order | trade`  
- `PositionCategory` в `protocols.ts`: зарезервированы `order`, `trade`  
- Папка `sources/deepbook/` — заглушка адаптера (не в `resolve.ts` до V1)

### Activity

- Константы видов: `TRADE`, `ORDER_CREATED`, `ORDER_FILLED`, `ORDER_CANCELLED`  
- Файл: `apps/api/src/lib/activityKinds.ts`

### Protocol adapters

```
positions/sources/
  native/     — navi, scallop, cetus, …
  blockvision/
  deepbook/   — post-MVP (V1)
```

## Связанные файлы

- [`ROADMAP.md`](../ROADMAP.md) — живой чеклист  
- [`docs/mvp.md`](./mvp.md) — исходный техдизайн (DeepBook в списке протоколов v2+, не в MVP scope)
