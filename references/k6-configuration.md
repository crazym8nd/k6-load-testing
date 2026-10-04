# Конфигурация k6

## Фикстуры (endpoints.js)

Старт — `template/scripts/services/new-service/endpoints.js`. Формат:

```js
export default {
  baseUrl: 'http://host.docker.internal:8080',
  get: [
    { name: 'product-card', url: '/api/v1/products/2777?saleOrgId=1000&plantId=1000', tag: 'product-card', sloP95Ms: 100 },
  ],
  post: [
    { name: 'get-by-plant', url: '/api/v1/products/get-by-plant', tag: 'get-by-plant',
      body: { plantId: '1000', items: [{ productId: '2777' }] }, sloP95Ms: 500 },
  ],
};
```

Поля: `name` — имя; `url` — путь (без `baseUrl`); `tag` — короткий id для метрик и порогов; `body` — для POST (объект или функция, возвращающая объект); `sloP95Ms` — переопределяет глобальный `SLO_P95_MS` (необязательно).

## Регистрация (services.js)

Старт — `template/scripts/lib/services.js` (пустой реестр). Заполнить:

```js
import newService from '../services/new-service/endpoints.js';
const REGISTRY = { 'new-service': newService /* , ... */ };
```
