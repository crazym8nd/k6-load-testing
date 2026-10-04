# Локальный стенд

Запуск **строго через Docker** (`docker build` → `docker run` с `--memory`/`--cpus`), не `java -jar` напрямую — иначе не задать лимиты CPU/RAM и env. Нюансы, которые почти всегда всплывают:

- **Отключить внешние интеграции** env-флагами, чтобы сервис стартовал чисто и не лез в прод-зависимости: auth (`SECURITY_AUTH_ENABLED=false` — контроллеры под `@Secured`), LDAP/Kafka/SAP/notification/scheduler/jobs (`..._ENABLED=false`). Флаги брать из `application.yml`/values прод-конфига.
- **БД локально без SSL**: прод часто `sslmode=verify-full`, локально не подходит — опустошить `POSTGRES_DB_ARGS` (или `sslmode=disable`).
- **Базовый образ Dockerfile недоступен** (Docker Hub down) — взять локальный и перетегнуть: `docker tag <local-image> <FROM-тег-Dockerfile>`, затем `docker build` (без pull).

## Заглушка зависимости (WireMock)

Если сервис ходит во внешний REST API и нужно управлять его поведением в тесте:

1. Поднять: `docker run -p <port>:8080 wiremock/wiremock:3.13.1`.
2. Стаб в `mappings/*.json`: `request` (method + `urlPathPattern`) → `response` (`status`, `jsonBody`).
3. Деградация: `fixedDelayMilliseconds` — медленный ответ; `docker stop` — сервис недоступен (connection refused).
