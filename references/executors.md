# k6 Executors — справочник

Скил использует **два** исполнителя: `constant-arrival-rate` (baseline) и `ramping-arrival-rate`
(stress). Остальные — для будущих типов (spike/soak) и общего понимания.

## Две модели нагрузки

| Модель | Что задаёшь | При насыщении |
|---|---|---|
| **Open** (arrival-rate) | RPS (итерации/с) | очередь растёт → латентность и `dropped_iterations` растут |
| **Closed** (VU-based) | число одновременных VU | throughput = VU ÷ время ответа (сверх не растёт) |

**Правило:** user-facing API → open (RPS); worker/пул соединений → closed (VU).

## Исполнители

| Executor | Модель | Назначение |
|---|---|---|
| `constant-arrival-rate` | open | **baseline** + **soak** (длинный `DURATION`) |
| `ramping-arrival-rate` | open | **stress** (ступени) + **spike** (мгновенный скачок) |
| `constant-vus` | closed | soak — фикс. VU долго (если closed-модель) |
| `ramping-vus` | closed | spike — скачок VU (если closed-модель) |
| `per-vu-iterations` | closed | каждый VU ровно N итераций |
| `shared-iterations` | closed | ровно N итераций на всех VU |
| `externally-controlled` | — | живое управление VU через REST API |

## constant-arrival-rate (baseline)

```js
scenarios: { constant_load: {
  executor: 'constant-arrival-rate',
  rate: 100, timeUnit: '1s', duration: '2m',
  preAllocatedVUs: 20, maxVUs: 800, gracefulStop: '30s',
}}
```

## ramping-arrival-rate (stress)

Каждая ступень `{duration, target}` линейно ведёт RPS от предыдущей цели к новой; пара
`{ramp}` + `{hold}` = подняться и удержаться.

```js
scenarios: { stress: {
  executor: 'ramping-arrival-rate', startRate: 0, timeUnit: '1s',
  stages: [
    { duration: '30s', target: 200 },   // ramp
    { duration: '1m',  target: 200 },   // hold
    { duration: '30s', target: 400 },   // ramp
    { duration: '1m',  target: 400 },   // hold
    { duration: '30s', target: 0   },   // down
  ],
  preAllocatedVUs: 60, maxVUs: 4000,
}}
```

## VU-sizing

- `preAllocatedVUs = ceil(rate × p95_сек × 1.2)` — стартовый пул.
- `maxVUs` — с запасом (по умолчанию ×40 от preAllocated). При насыщении p95 растёт → VU нужно
  больше, чем даёт формула. Заниженный `maxVUs` → `dropped_iterations > 0` (см. SKILL.md
  «Нагрузка дошла до сервера?»).
- `gracefulStop ≥ 2 × p99` — чтобы хвост не обрезался.
