# Локальный запуск (Supabase self-hosted + Next.js)

Этот документ описывает, как поднять проект локально на macOS/Linux:
- Supabase (self-hosted) через Docker Compose
- Next.js приложение (web) через Docker Compose или через `npm run dev`

## 0) Требования

- Docker Desktop (или Docker Engine + compose plugin)
- Node.js (рекомендуемо LTS)
- `npm` или `pnpm` (в репозитории есть `package-lock.json`, поэтому проще всего `npm`)

## 1) Переменные окружения

В проекте используются **два уровня** env:

- `.env` — используется как **build args** для Docker-сборки `web` (в первую очередь `NEXT_PUBLIC_*`).
- `.env.docker` — используется как **runtime env** для контейнера `web`.

### 1.1) Web env

Скопируй шаблон и заполни:

```bash
cp env.docker.example .env.docker
```

Минимально нужно:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Если используешь админ-2FA/уведомления:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ADMIN_CHAT_ID` (или `ADMIN_CHAT_ID` — зависит от реализации)

### 1.2) Supabase env

Supabase self-hosted хранит env в:

- `infra/supabase/docker/.env`

Создай файл на основе примера:

```bash
cp infra/supabase/docker/.env.example infra/supabase/docker/.env
```

Обязательно:

- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `ANON_KEY`
- `SERVICE_ROLE_KEY`
- `SITE_URL`
- `API_EXTERNAL_URL`
- `SUPABASE_PUBLIC_URL`

Важно: чтобы `web` работал корректно, значения должны совпадать:

- `NEXT_PUBLIC_SUPABASE_URL` (в `.env` / `.env.docker`) = `API_EXTERNAL_URL` (в `infra/supabase/docker/.env`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (в `.env` / `.env.docker`) = `ANON_KEY` (в `infra/supabase/docker/.env`)
- `SUPABASE_SERVICE_ROLE_KEY` (в `.env.docker`) = `SERVICE_ROLE_KEY` (в `infra/supabase/docker/.env`)

## 2) Запуск Supabase локально

Перейди в папку Supabase и подними стек:

```bash
cd infra/supabase/docker

docker compose up -d
```

Проверка health (должно отвечать):

- Auth health:

```bash
curl -sS http://localhost:8000/auth/v1/health -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"
```

- REST (PostgREST) пример:

```bash
curl -sS "http://localhost:8000/rest/v1/land_plots?select=id&limit=1" \
  -H "apikey: <ANON_KEY>" \
  -H "Authorization: Bearer <ANON_KEY>"
```

Примечание: `localhost:8000` — это Kong gateway в self-hosted Supabase.

## 3) Применение SQL/миграций (схема проекта)

В проекте есть SQL-скрипты в `scripts/` и миграции в `supabase/migrations/`.

### 3.1) Быстрый способ через psql внутри контейнера

Пример запуска одного SQL:

```bash
# из корня репозитория
cat scripts/001-create-land-plots-table.sql | docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1
```

Важно:
- Всегда используй `-v ON_ERROR_STOP=1`, чтобы видеть ошибку и не продолжать выполнение.
- Большинство скриптов уже сделаны идемпотентными (можно запускать повторно).

### 3.2) Если PostgREST “не видит” новые колонки

Иногда после `ALTER TABLE` PostgREST (supabase-rest) продолжает работать со старым schema cache.

Решение:

```bash
docker restart supabase-rest
```

## 4) Запуск web приложения

Есть 2 варианта.

### Вариант A (рекомендовано): через Docker Compose

1) Убедись, что Supabase поднят (раздел 2).
2) В корне проекта подними `web`:

```bash
docker compose up -d --build web
```

Открой:

- http://localhost:3000

### Вариант B: через Node (dev режим)

1) Убедись, что Supabase поднят (раздел 2).
2) Установи зависимости:

```bash
npm install
```

3) Создай `.env.local` (если нужно) или используй `.env`/`.env.docker` (зависит от того, как у тебя настроено чтение env в dev).
4) Запусти:

```bash
npm run dev
```

## 5) Типовые проверки

### 5.1) Проверка ключей (частая причина 401/500)

Если в админке/апи появляется `Invalid authentication credentials`:

- **Сверь**, что ключи `ANON_KEY`/`SERVICE_ROLE_KEY` из Supabase совпадают с `NEXT_PUBLIC_SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` в `web`.

### 5.2) Проверка заявок (leads)

Если форма “записаться на просмотр” пишет “Ошибка отправки заявки”, частая причина — в базе нет новых колонок (например `lead_type`, `plot_id` и др.).

Проверка наличия колонок:

```bash
docker exec -i supabase-db psql -U postgres -d postgres -c "\
select column_name
from information_schema.columns
where table_schema='public' and table_name='leads'
order by ordinal_position;\
"
```

В репозитории есть миграция:

- `scripts/015-add-viewing-leads-fields.sql`

После применения:

```bash
docker restart supabase-rest
```

## 6) Troubleshooting

### 6.1) Посмотреть статус контейнеров

```bash
# Supabase
cd infra/supabase/docker
docker compose ps

# Web
cd -
docker compose ps
```

### 6.2) Логи

```bash
# Web
docker logs -n 200 rkkland_web

# Supabase auth/rest
docker logs -n 200 supabase-auth
docker logs -n 200 supabase-rest

# DB
docker logs -n 200 supabase-db
```

### 6.3) Полный сброс локальных данных Supabase (осторожно)

Если нужно начать с чистого состояния, проще удалить volumes Supabase.
**Это удалит локальную базу и storage**.

```bash
cd infra/supabase/docker

docker compose down -v
```

Дальше снова `docker compose up -d` и применяй SQL/миграции.

## Команды (2 шага)

```bash
docker stop rkkland_web 2>/dev/null || true
npm run dev
```

Если нужно запустить локальную копию Supabase (вручную):

```bash
cd infra/supabase/docker && docker compose up -d
```

Примечание: запуск Supabase не требуется для работы web-приложения. Supabase stack является опциональным и следует запускать только при необходимости. 