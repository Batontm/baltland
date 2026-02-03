# Supabase Database (Postgres + Storage) — подробная документация

Этот проект использует Supabase как:

- **Postgres (Database)**: хранение данных приложения (участки, лиды, настройки, контент и т.п.)
- **Storage**: хранение файлов (картинки участков, PDF/изображения для юридических материалов и т.п.)
- **Auth**: аутентификация админов/менеджеров через Supabase Auth (плюс отдельная таблица `users` в Postgres — исторически)
- **RLS (Row Level Security)**: политики доступа к таблицам

Документ основан на фактических SQL-скриптах и использовании таблиц в коде репозитория.

---

## 1) Где что хранится

### 1.1 Postgres (таблицы)
В Postgres хранятся:

- **Объекты каталога**: `land_plots`, `land_plot_images`
- **Контент**: `news`, `faq_items`, `legal_content`, `landing_benefits_section`, `landing_benefit_items`
- **CRM-часть**: `leads`, `subscribers`, `commercial_proposals`, `commercial_proposal_plots`
- **Настройки сайта**: `organization_settings` (включая `map_settings`, настройки чата и AI)
- **Чат-виджет**: `chat_sessions`, `chat_messages`
- **Справочник описаний посёлков для импорта**: `settlement_descriptions`

Важно: Postgres **обычно не хранит** “сами картинки” как бинарные данные. Вместо этого хранится **путь к файлу в Storage** и/или **публичный URL**.

### 1.2 Storage (файлы)
В проекте в коде явно используется bucket:

- **Bucket**: `land-images`

Типовые пути, которые формирует код:

- **Картинки участков**: `plots/<plotId>/<uuid>.<ext>`
- **Загрузка прочих файлов (legal/pdf/etc.)**: `<type>/<uuid>.<ext>` где `type` по умолчанию `legal`

Storage хранит **байты файлов**, а Postgres хранит **ссылки/метаданные**.

---

## 2) Supabase clients и ключи (как проект ходит в БД)

Файл: `lib/supabase/admin.ts`

### 2.1 `createAdminClient()`
- Использует `SUPABASE_SERVICE_ROLE_KEY`
- **Обходит RLS** (service role)
- Применяется для admin/server actions, импорта, синка координат, загрузки файлов

### 2.2 `createClient()`
- Использует `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Уважает RLS и использует cookies для auth

---

## 3) Схема Postgres: таблицы, поля, связи

Ниже перечисление основных таблиц. SQL-источники указаны в скобках.

### 3.1 `land_plots` — основной каталог участков
Источник: `scripts/001-create-land-plots-table.sql` + доп. миграции.

Ключевые поля (фактические поля в коде `lib/types.ts`):

- `id uuid` — PK
- `title text/varchar` — название
- `description text` — описание
- `price numeric` — цена
- `area_sotok numeric` — площадь в сотках
- `district text` — район
- `region text` — иногда используется в коде как опциональное
- `location text` — посёлок/локация
- `distance_to_sea numeric` — расстояние до моря
- `land_status text` — ИЖС/СНТ/...
- `has_gas bool`
- `has_electricity bool`
- `has_water bool`
- `has_installment bool`
- `image_url text` — публичный URL обложки (как правило указывает на Storage)
- `is_featured bool` — выделение
- `is_active bool` — показывать на витрине
- `status text` — встречается как опциональное в типах
- `cadastral_number text` — кадастровый номер
- `created_at timestamptz`
- `updated_at timestamptz`

Поля для импорта/юридического статуса (источники: `scripts/015-add-plot-ownership-lease-vri.sql`):

- `ownership_type text` — `ownership` | `lease`
- `lease_from date`
- `lease_to date`
- `vri_id text` — id ВРИ/НСДП

Поля «бронь» (источник: `scripts/019-add-land-plot-reserved.sql`):

- `is_reserved bool`

Поля «бандлы/лоты» (источник: `scripts/020-add-land-plot-bundles.sql` + `migrations/add_bundle_title_column.sql`):

- `bundle_id uuid` — идентификатор лота (группа участков)
- `is_bundle_primary bool` — главный участок лота
- `bundle_title text` — заголовок лота

Ограничения/индексы по bundle:

- CHECK: `NOT is_bundle_primary OR bundle_id IS NOT NULL`
- INDEX: `idx_land_plots_bundle_id`
- UNIQUE partial: один primary на `bundle_id`

Поля геометрии/координат (источник: `migrations/add_plot_coordinates.sql` + доп. изменения в коде):

- `coordinates_json jsonb` — геометрия (Polygon/MultiPolygon и т.п.)
- `has_coordinates bool`
- `center_lat float8`
- `center_lon float8`

Поля ошибок синка координат (источник: `migrations/add_sync_error_column.sql`):

- `sync_error text`

Индексы из базового скрипта:

- `idx_land_plots_district`
- `idx_land_plots_price`
- `idx_land_plots_area`
- `idx_land_plots_active`

Индекс по координатам:

- `idx_land_plots_has_coordinates` (на `has_coordinates`)

#### Связанные сущности
- 1:N с `land_plot_images` (таблица изображений)
- M:N через `commercial_proposal_plots` (участки в коммерческих предложениях)

---

### 3.2 `land_plot_images` — изображения участков (метаданные)
Источник: `scripts/011-create-plot-images-and-placeholders.sql`

Поля:

- `id uuid` — PK
- `plot_id uuid` — FK → `land_plots(id)` ON DELETE CASCADE
- `storage_path text` — путь внутри Storage bucket
- `public_url text` — публичная ссылка
- `is_cover bool` — признак обложки
- `created_at timestamptz`

Индексы/ограничения:

- `idx_land_plot_images_plot_id`
- partial UNIQUE: `uniq_land_plot_images_cover_per_plot` (только одна обложка на участок)

Как используется в коде:

- API: `app/api/admin/plots/[plotId]/images/route.ts`
  - `POST`: загружает файл в Storage (`land-images`), пишет запись в `land_plot_images`
  - при `makeCover=true`: сбрасывает старую обложку и обновляет `land_plots.image_url`
  - `DELETE`: удаляет файл из Storage и запись из таблицы
  - `PUT`: делает выбранную картинку обложкой

---

### 3.3 `plot_placeholders` — плейсхолдеры изображений
Источник: `scripts/011-create-plot-images-and-placeholders.sql`

Поля:

- `id uuid` — PK
- `storage_path text`
- `public_url text`
- `created_at timestamptz`

---

### 3.4 `organization_settings` — настройки организации/сайта
Источник: `scripts/012-create-organization-settings.sql` + миграции.

Ключ:

- Вставляется строка с фиксированным id:
  - `00000000-0000-0000-0000-000000000001`

Поля (основные):

- `organization_name`, `phone`, `email`, `address`, `working_hours`
- `logo_url`, `favicon_url` (в типах)

Поля feature-toggles отображения:

- `show_*` (кадастр/цена/площадь/район/локация/статус/дистанция/удобства/картинка/соцсети и т.п.)

Социальные ссылки:

- `vk_url`, `telegram_url`, `whatsapp_url`, `youtube_url`, `instagram_url`

JSON-настройки карты:

- `map_settings jsonb` (источник: `scripts/014-add-map-settings.sql`)

Настройки AI (источник: `migrations/add_ai_settings.sql`):

- `ai_settlement_prompt text`
- `ai_provider varchar(50)`

Настройки чата (источник: `migrations/add_chat_settings_to_org.sql`):

- `chat_widget_enabled bool`
- `chat_welcome_message text`
- `chat_prompt_placeholder text`

Дополнительно в `lib/types.ts` присутствуют поля для Telegram-бота/шаблонов и NSPD-настроек (`nspd_settings`). Они могут быть добавлены другими миграциями/ручными изменениями в Supabase (это стоит проверить через Dashboard).

---

### 3.5 `subscribers` — подписчики
Источник: `scripts/002-add-subscribers-leads-users.sql`

Поля:

- `id uuid`
- `email unique`
- `is_active bool`
- `created_at`

---

### 3.6 `leads` — заявки/лиды
Источник: `scripts/002-add-subscribers-leads-users.sql` + расширения по полям встречаются в типах.

Базовые поля в SQL:

- `id uuid`
- `name`, `phone`, `wishes`
- `status` (по умолчанию `new`)
- `manager_comment`
- `created_at`, `updated_at`

Расширенные поля (есть в `lib/types.ts`, возможно добавлены отдельными миграциями):

- `lead_type` (`general` | `viewing` | `faq`)
- `plot_id`, `plot_location`, `plot_cadastral_number`, `plot_price`, `plot_area_sotok`
- `messenger_whatsapp`, `messenger_telegram`
- `assigned_to`

Рекомендация: сверить фактические колонки в Dashboard → Table editor.

---

### 3.7 `users` — менеджеры/админы (собственная таблица)
Источник: `scripts/002-add-subscribers-leads-users.sql`

Поля:

- `id uuid`
- `email unique`
- `password_hash`
- `name`
- `role` (по умолчанию `manager`)
- `is_active`
- `created_at`, `updated_at`

Важно:

- Supabase имеет встроенную схему `auth.users`.
- В этом проекте параллельно есть собственная таблица `public.users`.
- Нужно понимать, какая из них является «истиной» для админки. По коду часто используется server-side логика и проверка сессии (`getAdminSession`).

---

### 3.8 `news` — новости
Источник: `scripts/003-add-news.sql` + последующие фиксы политик (скрипты `004-006`).

Поля:

- `id uuid`
- `title`, `content`, `image_url`
- `is_published bool`
- `published_at`, `created_at`, `updated_at`

---

### 3.9 `commercial_proposals` / `commercial_proposal_plots` — КП
Источник: `scripts/010-create-commercial-proposals.sql`

`commercial_proposals`:

- FK: `lead_id → leads(id)`
- `title`, `description`
- `status` (`draft|sent|viewed|accepted|rejected`)
- `created_by → users(id)`
- `created_at`, `updated_at`, `sent_at`

`commercial_proposal_plots`:

- FK: `proposal_id → commercial_proposals(id)`
- FK: `plot_id → land_plots(id)`
- `sort_order`, `custom_note`, `created_at`
- UNIQUE `(proposal_id, plot_id)`

---

### 3.10 `landing_benefits_section` / `landing_benefit_items` — блок преимуществ на лендинге
Источник: `scripts/013-create-landing-benefits.sql`

`landing_benefits_section`:

- фиксированный `id` (как и у organization_settings)
- заголовки/подзаголовки
- поля левой/правой колонки (тексты, ссылки, изображения)
- `is_active`, `created_at`, `updated_at`

`landing_benefit_items`:

- FK `section_id → landing_benefits_section(id)`
- тексты, иконки, сортировка
- `is_active`, `created_at`, `updated_at`

---

### 3.11 `settlement_descriptions` — описания посёлков для импорта
Источник: `scripts/016-create-settlement-descriptions.sql`

Поля:

- `district_name`, `settlement_name`
- `description`
- UNIQUE `(district_name, settlement_name)`

---

### 3.12 `faq_items` — FAQ
Источник: `migrations/add_faq_table.sql`

Поля:

- `question`, `answer`, `category`, `icon`
- `sort_order`, `is_active`
- `created_at`, `updated_at`

---

### 3.13 `legal_content` — юридический контент
Источник: `migrations/add_legal_content_table.sql`

Поля:

- `title`, `content`
- `image_url`, `pdf_url`
- `sort_order`, `is_active`
- `created_at`, `updated_at`

---

### 3.14 `chat_sessions` / `chat_messages` — чат
Источник: `migrations/add_chat_tables.sql`

`chat_sessions`:

- `id uuid`
- `user_name`, `user_email`
- `last_message_at`, `created_at`

`chat_messages`:

- FK `session_id → chat_sessions(id)` ON DELETE CASCADE
- `text`
- `sender` CHECK (`user|admin`)
- `telegram_message_id bigint`
- `created_at`

---

## 4) RLS (Row Level Security) и доступ

Большинство таблиц включает `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.

Типовой паттерн:

- Публичный SELECT (например, `land_plots` только `is_active=true`, `news` только опубликованные, `organization_settings` — публично)
- Полный CRUD для `authenticated` (либо “для всех” при использовании service role в server actions)

Важно:

- Если серверные действия используют `createAdminClient()` (service role), то RLS фактически не мешает.
- Если чтение идёт с `createClient()` (anon + cookies), то политика должна разрешать нужные SELECT.

---

## 5) Storage: bucket, структура путей и публичные ссылки

### 5.1 Bucket
По коду:

- `land-images`

### 5.2 Путь файлов
- Картинки участков: `plots/<plotId>/<uuid>.<ext>`
- Универсальная загрузка: `<type>/<uuid>.<ext>` (`type` по умолчанию `legal`)

### 5.3 Где в БД лежат ссылки
- `land_plot_images.storage_path` и `land_plot_images.public_url`
- `land_plots.image_url` как ссылка на обложку
- `news.image_url`, `legal_content.image_url/pdf_url`, `organization_settings.logo_url` и т.п.

---

## 6) Практические запросы для диагностики в Supabase SQL Editor

### 6.1 Размер БД (в MB)
```sql
select
  pg_size_pretty(pg_database_size(current_database())) as db_size_pretty,
  round(pg_database_size(current_database())/1024.0/1024.0, 2) as db_size_mb;
```

### 6.2 Топ таблиц по размеру
```sql
select
  schemaname,
  relname as table_name,
  pg_size_pretty(pg_total_relation_size(relid)) as total_size,
  pg_total_relation_size(relid) as total_bytes
from pg_catalog.pg_statio_user_tables
order by total_bytes desc
limit 30;
```

### 6.3 Сколько строк в ключевых таблицах
```sql
select
  (select count(*) from land_plots) as land_plots,
  (select count(*) from land_plot_images) as land_plot_images,
  (select count(*) from leads) as leads,
  (select count(*) from subscribers) as subscribers,
  (select count(*) from news) as news;
```

### 6.4 Сколько активных участков и сколько лотов (bundle)
```sql
select
  count(*) filter (where is_active) as active_rows,
  count(*) filter (where is_active and bundle_id is null) as active_non_bundle,
  count(distinct bundle_id) filter (where is_active and bundle_id is not null) as active_distinct_bundles,
  (count(*) filter (where is_active and bundle_id is null)
   + count(distinct bundle_id) filter (where is_active and bundle_id is not null)
  ) as active_lots
from land_plots;
```

### 6.5 Участки без координат (для контроля синка)
```sql
select count(*)
from land_plots
where
  is_active = true
  and (
    coordinates_json is null
    or center_lat is null
    or center_lon is null
    or coalesce(has_coordinates, false) = false
  );
```

---

## 7) Что влияет на “объём” (и почему размер БД ≠ размер файлов)

- **Размер Postgres** растёт от:
  - количества строк (например, 2000+ участков)
  - больших текстов (описания)
  - JSONB геометрии (`coordinates_json`) — потенциально очень заметный вклад
- **Размер Storage** (бакеты) растёт от:
  - изображений участков
  - PDF и прочих медиа

Итого: “сколько мегабайт занимает Supabase” = **Postgres size + Storage size**.

- Postgres size можно узнать SQL-запросом выше.
- Storage size смотрится в Dashboard → Storage → buckets.

---

## 8) Проверки и чек-лист администрирования

### 8.1 Где посмотреть бакеты и объём картинок
- Supabase Dashboard → **Storage** → buckets → `land-images`
- смотреть:
  - количество файлов
  - общий объём
  - структура папок (`plots/<plotId>/...`)

### 8.2 Где посмотреть таблицы и колонки
- Supabase Dashboard → **Database** → Table editor

### 8.3 Где посмотреть политики RLS
- Supabase Dashboard → **Database** → Policies

### 8.4 Бэкапы
- Supabase Dashboard → **Database** → Backups (если включено на тарифе)

---

## 9) Замечания по безопасности

- `SUPABASE_SERVICE_ROLE_KEY` — полный доступ ко всем данным и обход RLS.
- Этот ключ **никогда** не должен попадать в клиент (браузер) и публичные логи.
- Если ключ был отправлен/утёк, безопасная практика:
  - **перегенерировать** service role key в Supabase
  - обновить `.env` на сервере

---

## 10) Что стоит дополнительно верифицировать (потому что это есть в типах/коде, но не видно в миграциях)

В `lib/types.ts` есть типы для справочников адресов:

- `District`, `Settlement`, `Street` и связанные поля `district_id`, `settlement_id`

При этом в SQL-скриптах этого репозитория таблицы не найдены.

Это значит одно из:

- таблицы создавались вручную в Supabase Dashboard
- таблицы добавлены через другой набор миграций (не в репозитории)
- типы остались от старой версии

Рекомендация: в Supabase SQL Editor выполнить:

```sql
select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

И сопоставить с этим документом.
