# 📁 Структура проекта: Landing page for land

## 📋 Обзор
Next.js 16 приложение для продажи земельных участков в Калининградской области с админ-панелью для управления каталогом, новостями и заявками.

---

## 🧭 Как работает сайт (кратко)

### Публичная часть
- **Главная** (`app/page.tsx`)
  - Загружает активные участки из `public.land_plots` (`is_active = true`).
  - Отдаёт список в `CatalogWithFilters` и отображает hero-статистику (кол-во, min/max цены).
- **Карточка участка** (`app/plots/[id]/page.tsx`) — детальная информация и фото.
- **Новости** (`app/news/[id]/page.tsx`) + публичные страницы (`/faq`, `/legal`, `/privacy`, `/terms`).

### Админ-панель
- **Точка входа**: `/staff` → редирект на `/admin/login`.
- **Логин**: `app/admin/login/page.tsx` + API `app/api/admin/login/route.ts`.
- **Сессия**: cookie `admin_session` (JWT через `jose`, срок 7 дней).
- **Защита**: Next.js middleware (`middleware.ts`) вызывает логику из `proxy.ts` и закрывает `/admin/*`.
- **Работа с БД**: Server Actions (`app/actions.ts`) и Supabase admin client (`lib/supabase/admin.ts`).

## 🗂️ Корневые файлы конфигурации

### `package.json`
Манифест проекта с зависимостями:
- **Next.js 16.0.10** - React фреймворк с App Router
- **React 19.2** - UI библиотека
- **Supabase** - База данных PostgreSQL и аутентификация
- **Tailwind CSS 4** - Utility-first CSS фреймворк
- **shadcn/ui** - Коллекция React компонентов
- **bcryptjs** - Хеширование паролей для админ-панели
- **jose** - JWT токены для сессий
- **xlsx** - Импорт данных из Excel
- **pdfjs-dist** - Просмотр PDF коммерческих предложений

### `next.config.mjs`
Конфигурация Next.js:
- `allowedDevOrigins` для dev-режима (разрешение запросов к `/_next/*` при открытии сайта по LAN/IP)
- `typescript.ignoreBuildErrors` включен
- `images`: AVIF/WebP форматы, кеш 30 дней, `remotePatterns` для `api.baltland.ru` и `*.supabase.co`
- `rewrites`: IndexNow ключ `/{key}.txt` → `/api/indexnow/key`

### `tsconfig.json`
Конфигурация TypeScript:
- Strict mode включен
- Алиасы путей (@/ = корень проекта)
- Target: ES2017

### `postcss.config.mjs`
Конфигурация PostCSS для Tailwind CSS 4

### `components.json`
Конфигурация shadcn/ui:
- Стиль: New York
- Цветовая схема: Zinc
- Tailwind CSS 4 с inline theme configuration

### `proxy.ts` (middleware)
**Критически важный файл** - защита админ-панели:
- Проверяет JWT токен в cookie `admin_session`
- Блокирует доступ к `/admin/*` без авторизации
- Разрешает доступ к `/admin/login` и `/admin/fix-password`
- Перенаправляет неавторизованных на страницу входа

### `middleware.ts`
Entrypoint для Next.js middleware. Делегирует выполнение в `proxy.ts`.

### `ADMIN_ACCESS.md`
Документация по доступу к админ-панели:
- Скрытый URL: `/staff`
- Логин и пароль по умолчанию
- Инструкции по восстановлению доступа

### `MAP_CLUSTERING.md` (Март 2026)
Информационный файл по кластеризации карты:
- Где используется текущая кластеризация (`LeafletCatalogMap`)
- Как работают уровни зума (кластеры → маркеры → полигоны)
- Параметры `MarkerClusterGroup` и кастомная SVG-иконка кластера
- Оптимизации производительности и чек-лист для изменения поведения

### `MAX_BOT_PLAN.md` (Март 2026)
План реализации чат-бота в MAX:
- Ограничения платформы и onboarding (юрлицо РФ, верификация, модерация)
- Архитектура интеграции в текущий Next.js проект
- Пошаговые фазы реализации (MVP поиск участков, заявки, расширения)
- Риски, сроки и чек-листы запуска

### `kupiprodai-plots.xml` (Март 2026)
XML-выгрузка выбранных участков для публикации на внешней площадке:
- Формат: `<rows><row>...</row></rows>`
- Контакты в выгрузке фиксированы под задачу (имя/телефон)
- Данные участков и описания берутся из `land_plots`, изображение — из `image_url`/`land_plot_images`

---

## 📂 Директория `app/` - Next.js App Router

### Основные страницы

#### `app/page.tsx`
**Главная страница сайта** - Landing page:
- Hero секция с призывом к действию
- Каталог земельных участков с фильтрами
- Блок новостей
- Секция преимуществ (динамическая, управляется из админки)
- Блок "Подберём участок" (Progressive Disclosure) - отдельный подбор с независимой модалкой карты результатов
- Контактная форма
- Footer с контактами и соц. сетями
- Просмотр карточек участков и новостей открывается в модальном окне (Dialog) без перехода на отдельные страницы

#### `app/layout.tsx`
**Корневой layout** для всего приложения:
- HTML структура с метаданными (SEO)
- Глобальные стили (`app/globals.css`) и базовая типографика через Tailwind (`font-sans`)
- Подключение Google Fonts через `next/font/google` отключено (устойчивость dev под Turbopack)
- Vercel Analytics
- Глобальные стили

#### `app/globals.css`
**Глобальные стили** с Tailwind CSS 4:
- CSS переменные для цветовой схемы (@theme inline)
- Дизайн токены (--background, --foreground, --primary и т.д.)
- Шрифты (--font-sans, --font-mono)
- Базовые стили body

#### `app/not-found.tsx` (Февраль 2026)
**Кастомная 404 страница**:
- Header и Footer для единообразного оформления
- Навигационные кнопки: каталог, ИЖС, недорогие участки, FAQ, новости
- Иконки Lucide для каждой ссылки

#### `app/loading.tsx`
**Универсальный loading state** для всех страниц:
- Показывается при навигации между страницами
- Spinner с анимацией

---

### Страница контактов (Февраль 2026)

#### `app/contacts/page.tsx`
**Страница контактов** (`/contacts`):
- Телефон, email, адрес офиса, часы работы
- Соцсети (VK, Telegram, WhatsApp, YouTube, Instagram) из `organization_settings`
- JSON-LD `ContactPage` schema для SEO
- Canonical URL, OG-метаданные
- Leaflet карта с маркером офиса
- Header, Footer, Breadcrumbs

#### `app/contacts/contacts-map-wrapper.tsx`
**Клиентская обёртка карты контактов**:
- Dynamic import (`next/dynamic`, SSR off) для `ContactsMap`
- Передаёт координаты и адрес

---

### Публичные страницы участков и новостей

#### `app/plots/[id]/page.tsx`
**Страница отдельного земельного участка**:
- Динамический роут с параметром `id`
- Карточка участка с полной информацией
- Галерея фотографий
- Кнопки "Заказать звонок" и "Оставить заявку"
- Breadcrumb навигация
- Загрузка данных из Supabase
- В проекте используется async params (`params: Promise<{ id: string }>`)

#### `app/plots/[id]/not-found.tsx`
**404 страница** для несуществующих участков:
- Показывается если участок с указанным ID не найден
- Кнопка возврата в каталог

#### `app/news/[id]/page.tsx`
**Страница отдельной новости**:
- Динамический роут с параметром `id`
- Полный текст новости с изображениями
- Дата публикации и автор
- Breadcrumb навигация
- Загрузка данных из Supabase
- В проекте используется async params (`params: Promise<{ id: string }>`)

#### `app/news/[id]/not-found.tsx`
**404 страница** для несуществующих новостей

- Рендерит `CatalogWithFilters` с пропсом `initialFilters`

#### `app/faq/page.tsx` (Январь 2026)
**Публичная страница FAQ (Помощь покупателю)**:
- Группировка вопросов по категориям (Коммуникации, Оплата и др.)
- Раскрывающиеся списки (Accordion) для ответов
- Встроенная форма обратной связи `FaqContactForm`
- Якорная ссылка для быстрого перехода к форме
- Загрузка данных через Server Action `getFaqItems(true)`

#### `app/legal/page.tsx`
**Публичная страница "Юридическая чистота"**:
- Динамический контент из БД (`legal_content`)
- Поддержка текста, изображений и PDF-файлов
- Современный дизайн с акцентом на доверие и прозрачность
- Интеграция с Hero-секцией главной страницы через бейдж

---

### Альтернативные дизайны

#### `app/minimalist/page.tsx`
**Минималистичный вариант** главной страницы:
- Упрощенный дизайн с акцентом на контент
- Меньше декоративных элементов

#### `app/luxury/page.tsx`
**Премиум вариант** главной страницы:
- Роскошный дизайн с премиум визуалом
- Акцент на эксклюзивность предложений

---

### Административная панель

#### `app/staff/page.tsx`
**Скрытая точка входа** в админ-панель:
- URL: `/staff` (не показывается в навигации)
- Редиректит на `/admin` если авторизован
- Редиректит на `/admin/login` если не авторизован
- Единственный способ попасть в админ-панель

#### `app/admin/page.tsx`
**Главная страница админ-панели**:
- Проверка JWT токена из cookie
- Редирект на логин если не авторизован
- Рендерит `AdminDashboard` компонент
- Server Component с async/await

#### `app/admin/login/page.tsx`
**Страница входа в админ-панель**:
- Форма логина с username и password
- Отправка данных на `/api/admin/login`
- Установка JWT токена в HTTP-only cookie
- Редирект на `/admin` после успешного входа

#### `app/admin/fix-password/page.tsx`
**Служебная страница для сброса пароля**:
- Генерирует свежий bcrypt хеш для пароля "123"
- Обновляет пароль в базе данных
- Проверяет работоспособность нового хеша
- Перенаправляет на страницу логина
- Используется для восстановления доступа

#### `app/admin/reset-password/page.tsx`
**Альтернативная страница сброса пароля** (дубликат fix-password)

#### `app/admin/proposal-preview/page.tsx`
**Страница полноэкранного предпросмотра КП** (добавлено декабрь 2025):
- Server component с проверкой авторизации через `getAdminSession()`
- Загрузка настроек организации из БД
- Рендерит клиентский компонент `ProposalPreviewPageClient`

#### `app/admin/proposal-preview/client.tsx`
**Клиентский компонент предпросмотра КП** (добавлено декабрь 2025):
- Отображение шаблона КП с применением всех настроек из `OrganizationSettings`
- Демо-данные участков для предпросмотра
- Кнопки: "Назад в админку", "Печать", "На весь экран"
- Динамические стили по настройкам (шрифты, цвета, позиционирование)
- Загрузка кастомного шрифта через @font-face

---

### API Routes

#### `app/api/admin/login/route.ts`
**POST API для авторизации администратора**:
- Принимает username и password
- Проверяет учетные данные в таблице `admin_users`
- Использует bcrypt.compare() для проверки пароля
- Генерирует JWT токен через библиотеку `jose`
- Устанавливает HTTP-only cookie `admin_session` (Secure включается только при HTTPS)
- Возвращает success/error статус
- **Детальное логирование** для отладки
- **Уведомления в Telegram**:
  - ✅ Успешный вход (логин, IP, User-Agent)
  - 🚨 Неудачные попытки входа (логин, IP, число попыток за минуту) с троттлингом

#### `components/admin/dashboard/settings/map-settings-card.tsx`
**Карточка настроек карты (UI)**:
- Редактирует `organization_settings.map_settings`
- Параметры: центр/zoom, пороги зума для кластеров/детализации, цвета полигонов/маркеров, состав tooltip, подписи маркеров
- Используется во вкладке `Карта` (ниже карты)

#### `app/api/admin/logout/route.ts`
**POST API для выхода из админ-панели**:
- Удаляет cookie `admin_session`
- Редиректит на `/admin/login`

#### `app/api/import-logs/route.ts`
**GET API для получения логов импорта**:
- Возвращает историю импорта участков
- Фильтрация по дате
- Используется в админ-панели

#### `app/api/import-logs/dates/route.ts`
**GET API для получения доступных дат импорта**:
- Возвращает список дат когда производился импорт
- Используется для фильтрации в админ-панели

#### `app/api/admin/plots/[plotId]/images/route.ts`
**API управления изображениями участка (админ)**:
- GET: список изображений участка
- POST: загрузка изображения в Supabase Storage + запись в `land_plot_images`
- PUT: назначение cover-изображения
- DELETE: удаление изображения из Storage и БД
- Разрешены форматы: jpeg/png/webp
- Используется bucket `land-images` (public)

#### `app/api/admin/settlement-descriptions/import/route.ts` (Январь 2026)
**API импорта описаний поселков (админ)**:
- POST: принимает JSON файл (multipart/form-data, поле `file`)
- Делает upsert в `settlement_descriptions` по ключу (`district_name`, `settlement_name`)
- Используется в админке во вкладке "Описание поселков" для массового добавления описаний

**Пример файла для импорта**:
- `scripts/settlement-descriptions-import-example.json`
- В Next.js используется async params (`params: Promise<{ plotId: string }>`)

#### `app/api/admin/placeholders/route.ts`
**API управления заглушками (админ)**:
- GET: список заглушек
- POST: загрузка заглушки в Supabase Storage + запись в `plot_placeholders`
- DELETE: удаление заглушки
- Разрешены форматы: jpeg/png/webp
- Используется bucket `land-images` (public)

#### `app/api/admin/news/image/route.ts`
**POST API загрузки картинки новости (админ)**:
- Загрузка изображения в Supabase Storage (`land-images/news/...`)
- Возвращает публичный URL, который сохраняется в поле `news.image_url`
- Разрешены форматы: jpeg/png/webp

#### `app/api/admin/landing/benefits/route.ts`
**GET/PUT API для блока преимуществ на главной (админ)**:
- GET: получение `landing_benefits_section` и `landing_benefit_items`
- PUT: обновление секции и элементов (включая удаление удалённых карточек)

#### `app/api/admin/landing/benefits/image/route.ts`
**POST API загрузки изображений/иконок для блока преимуществ (админ)**:
- Загрузка в Supabase Storage (`land-images/landing/benefits/...`)
- Возвращает публичный URL
- Разрешены форматы: jpeg/png/webp

#### `app/api/admin/telegram/` - API управления Telegram ботом

##### `app/api/admin/telegram/config/route.ts`
**GET/POST API конфигурации бота**:
- GET: получение токена (замаскированного), Chat ID, webhook URL, информации о боте
- POST: сохранение настроек в `organization_settings`
- Валидация токена через Telegram API

##### `app/api/admin/telegram/webhook/route.ts`
**POST/DELETE API управления webhook**:
- POST: установка webhook URL в Telegram
- DELETE: удаление webhook

##### `app/api/admin/telegram/test/route.ts`
**POST API тестового сообщения**:
- Отправляет тестовое сообщение в Telegram
- Проверяет работоспособность бота

##### `app/api/admin/telegram/info/route.ts`
**GET API информации о боте**:
- Получение getMe и getWebhookInfo из Telegram API

##### `app/api/admin/telegram/templates/route.ts`
**GET/POST API шаблонов сообщений**:
- GET: получение шаблонов уведомлений
- POST: сохранение шаблонов с переменными ({name}, {phone}, {cadastral})

#### `app/api/admin/max/webhook/route.ts` (Март 2026)
**GET/POST/DELETE API управления webhook MAX**:
- GET: получение текущих подписок бота (`/subscriptions`)
- POST: установка webhook (`https://.../api/max-bot/webhook`) и `update_types`
- DELETE: удаление webhook подписки
- Авторизация к MAX API через заголовок `Authorization: <MAX_BOT_TOKEN>`

#### `app/api/telegram/webhook/route.ts`
**POST API обработки входящих сообщений от Telegram**:
- Обработка команд: `/search`, `/plot`, `/stats`, `/help`
- Обработка callback-кнопок: `kp:`, `location:`, `done:`
- Поиск участков по локации
- Детальная информация об участке (КП)
- Отметка заявки как обработанной

#### `app/api/max-bot/webhook/route.ts` (Март 2026)
**POST API обработки входящих событий от MAX**:
- Принимает webhook payload от MAX
- Нормализует входящее событие через `lib/max-bot/index.ts`
- Обрабатывает команды `/start`, `/help`, `/search`
- Запускает flow поиска участков с пагинацией и детальной карточкой

#### `app/api/indexnow/route.ts` (Февраль 2026)
**POST API для IndexNow (Яндекс)**:
- Принимает массив `urls` для быстрой индексации
- Отправляет запрос на `https://yandex.com/indexnow`
- Ключ из env `INDEXNOW_KEY`

#### `app/api/indexnow/key/route.ts` (Февраль 2026)
**GET API ключа IndexNow**:
- Возвращает ключ IndexNow в текстовом формате
- Используется через rewrite `/{key}.txt` → `/api/indexnow/key`

#### `app/api/admin/social/` - API публикаций в социальные сети

**Общая архитектура (Февраль 2026)**:
- Поддерживаемые платформы: VK (ВКонтакте), OK (Одноклассники)
- Единая структура таблиц: `social_posts`, `social_settings`, `social_logs`
- Rate limiting для API запросов (3 req/sec)
- Автоматическая синхронизация (удаление проданных участков)

##### `app/api/admin/social/vk/` - API для ВКонтакте

###### `app/api/admin/social/vk/settings/route.ts`
**GET/POST API настроек VK**:
- GET: получение настроек (enabled, daily_limit, auto_delete_sold, publish_time)
- POST: сохранение настроек в `social_settings` (platform='vk')
- Логирование изменений в `social_logs`

###### `app/api/admin/social/vk/bulk-publish/route.ts`
**POST API массовой публикации в VK**:
- Принимает `limit` (количество участков) и `publishAll` (опционально)
- Фильтрует уже опубликованные участки
- Вызывает `publishPlotToVK()` из `lib/vk-api.ts`
- Записывает результаты в `social_posts`
- Rate limiting между запросами

###### `app/api/admin/social/vk/sync/route.ts`
**POST API синхронизации VK**:
- Удаляет посты для проданных/неактивных участков
- Вызывает `deleteWallPost()` для удаления из VK
- Обновляет статус в `social_posts` на 'deleted'

###### `app/api/admin/social/vk/reset/route.ts`
**POST API сброса счётчика VK**:
- Удаляет все записи из `social_posts` для platform='vk'
- Логирует действие

##### `app/api/admin/social/ok/` - API для Одноклассников

###### `app/api/admin/social/ok/settings/route.ts`
**GET/POST API настроек OK**:
- GET: получение настроек (enabled, daily_limit, auto_delete_sold, publish_time)
- POST: сохранение настроек в `social_settings` (platform='ok')
- Логирование изменений в `social_logs`

###### `app/api/admin/social/ok/bulk-publish/route.ts`
**POST API массовой публикации в OK**:
- Принимает `limit` (количество участков) и `publishAll` (опционально)
- Фильтрует уже опубликованные участки
- Вызывает `publishPlotToOK()` из `lib/ok-api.ts`
- Записывает результаты в `social_posts`
- Rate limiting между запросами

###### `app/api/admin/social/ok/sync/route.ts`
**POST API синхронизации OK**:
- Удаляет посты для проданных/неактивных участков
- Вызывает `deleteGroupTopic()` для удаления из OK
- Обновляет статус в `social_posts` на 'deleted'

###### `app/api/admin/social/ok/reset/route.ts`
**POST API сброса счётчика OK**:
- Удаляет все записи из `social_posts` для platform='ok'
- Логирует действие

##### `app/api/admin/social/stats/route.ts`
**GET API статистики публикаций**:
- Возвращает агрегированные данные по всем платформам
- Для каждой платформы: published, errors, deleted, unpublished
- Подсчёт общего количества активных участков

##### `app/api/admin/social/logs/route.ts`
**GET API логов публикаций**:
- Параметры: `platform`, `limit`
- Возвращает последние записи из `social_logs`

##### `app/api/cron/vk-auto-publish/route.ts`
**Cron задача автопубликации VK**:
- Проверяет настройки автопубликации
- Публикует участки по расписанию (publish_time)
- Соблюдает daily_limit

##### `app/api/cron/ok-auto-publish/route.ts`
**Cron задача автопубликации OK**:
- Проверяет настройки автопубликации
- Публикует участки по расписанию (publish_time)
- Соблюдает daily_limit

---

### Server Actions

#### `app/actions.ts`
**Коллекция Server Actions** для работы с данными:

**Участки:**
- `getLandPlots()` - получение списка участков с фильтрацией
- `getLandPlotById(id)` - получение конкретного участка
- `createLandPlot(data)` - создание нового участка
- `updateLandPlot(id, data)` - обновление участка
- `deleteLandPlot(id)` - удаление участка

**Новости:**
- `getNews()` - получение новостей
- `getNewsById(id)` - получение конкретной новости
- `createNews(data)` - создание новости
- `updateNews(id, data)` - обновление новости
- `deleteNews(id)` - удаление новости

**Заявки и подписчики:**
- `createLead(data)` - создание заявки от клиента
- `getLeads()` - получение всех заявок
- `updateLead(id, data)` - обновление заявки
- `deleteLead(id)` - удаление заявки
- `getSubscribers()` - получение подписчиков
- `updateSubscriber(id, data)` - обновление подписчика
- `deleteSubscriber(id)` - удаление подписчика

**Пользователи:**
- `getUsers()` - получение пользователей системы
- `createUser(data)` - создание пользователя
- `updateUser(id, data)` - обновление пользователя
- `deleteUser(id)` - удаление пользователя

**Коммерческие предложения:**
- `createCommercialProposal(data)` - создание КП
- `getCommercialProposalsByLead(leadId)` - получение КП по заявке
- `updateCommercialProposal(id, data)` - обновление КП
- `deleteCommercialProposal(id)` - удаление КП

**Адресные данные (новое):**
- `getDistricts()` - получение районов из БД
- `getSettlements(districtId?)` - получение населенных пунктов
- `getSettlementsByDistrictName(districtName)` - получение поселков по имени района
- `getStreets(settlementId?)` - получение улиц

**Настройки:**
- `getOrganizationSettings()` - получение настроек организации
- `updateOrganizationSettings(data)` - обновление настроек

**Landing (преимущества):**
- `getLandingBenefits()` - получение блока преимуществ для главной
- `updateLandingBenefits(data)` - обновление секции и карточек преимуществ

**Авторизация:**
- `logoutAdmin()` - выход из админ-панели (удаление cookie)

**Telegram уведомления:**
- `createViewingLead()` - отправляет уведомление в Telegram с кнопками (КП, Все в посёлке, Обработано)
- Использует `sendMessageWithButtons()` из `lib/telegram.ts`

**Координаты и НСПД (Январь 2026):**
- `getPlotGeometry(cadastralNumber)` - получение геометрии из NSPD API
- `resolveLocationByCadastral(cadastralNumber)` - **НОВОЕ**: автоматическое определение района и поселка по КЛАДР на основе адреса из НСПД
- `syncPlotCoordinates(plotId)` - синхронизация координат и авто-детекция статуса земли
- `syncSinglePlot(plotId)` - обертка для синхронизации конкретного участка
- `syncLandPlotsFromData(data, settlement, replaceAll, logData, autoResolve)` - обновлен: поддерживает параметр `autoResolve` для включения автоматического маппинга адресов

- Все функции используют Supabase клиент
- Row Level Security (RLS) для безопасности

#### `app/actions/parser.ts`
**Server Action для парсинга новостей из RSS**:
- `parseNewsAction(keywords)` - запускает парсинг по ключевым словам
- Возвращает результат: добавлено, пропущено дублей, ошибки
- Вызывает `parseNewsByKeywords()` из `lib/parser.ts`

---

## 📂 Директория `components/` - React компоненты

### Административные компоненты

#### `components/admin/admin-dashboard.tsx`
**Главная панель администратора** (рефакторинг завершен):
- **Архитектура**: Оркестратор компонентов, управляет состоянием и маршрутизацией
- Табы для переключения между секциями (все вынесены в отдельные компоненты):
  - **Дашборд** (`StatsOverview`) - статистика и обзор
  - **Участки** (`PlotsTab`) - просмотр, редактирование, удаление
  - **Импорт** (`ImportTab`) - импорт/экспорт участков и просмотр логов импорта
  - **Карта** (`MapTab`) - интерактивная карта всех участков на базе Яндекс.Карт
  - **Новости** (`NewsTab`) - управление новостями + парсер RSS
  - **Заявки** (`LeadsTab`) - просмотр лидов от клиентов, создание КП
  - **Подписчики** (`SubscribersTab`) - управление email подписчиками
  - **Пользователи** (`UsersTab`) - управление пользователями системы
  - **Настройки** (`SettingsTab`) - настройки организации и отображения
  - **Telegram** (`TelegramTab`) - настройки бота и шаблоны сообщений
  - **Чат** (`ChatSettingsCard`) - управление виджетом онлайн-чата
  - **FAQ** (`FaqTab`) - управление вопросами и ответами
  - **Юридическая чистота** (`LegalTab`) - управление контентом для страницы `/legal`
  - **Публикации** (`PublicationsTab`) - единый центр управления публикациями в соцсети (VK, OK). Заменяет старый `SocialNetworksTab`.
- Управление состоянием (state management)
- Обработчики для всех операций CRUD
- Диалоги для коммерческих предложений и PDF просмотра вынесены в `components/admin/dashboard/proposals/*`
- **Адресные данные из БД (новое)**:
  - Загрузка районов при монтировании компонента
  - Динамическая загрузка населенных пунктов при выборе района
  - Каскадные фильтры в диалоге коммерческих предложений
  - State: `districts`, `settlements`, `loadingAddresses`
- Кнопка выхода

#### `components/admin/dashboard/` - Компоненты вкладок админ-панели

**Рефакторинг (декабрь 2024)**: крупные UI-блоки вынесены в подкомпоненты:
- `components/admin/dashboard/stats-overview.tsx`
- `components/admin/dashboard/plots-tab.tsx`
- `components/admin/dashboard/map-tab.tsx`
- `components/admin/dashboard/import-tab.tsx`
- `components/admin/dashboard/news-tab.tsx`
- `components/admin/dashboard/leads-tab.tsx`
- `components/admin/dashboard/subscribers-tab.tsx`
- `components/admin/dashboard/users-tab.tsx`
- `components/admin/dashboard/settings-tab.tsx`
- `components/admin/dashboard/telegram-tab.tsx`
- `components/admin/dashboard/publications-tab.tsx` - компонент-обертка с вкладками VK и OK
- `components/admin/dashboard/social-networks-tab.tsx` - управление публикациями ВКонтакте
- `components/admin/dashboard/odnoklassniki-tab.tsx` - управление публикациями Одноклассники
- `components/admin/dashboard/news-parser-widget.tsx`
- `components/admin/dashboard/proposals/` - Компоненты коммерческих предложений (диалоги/превью)
- `components/admin/dashboard/proposals/universal-proposal-tool.tsx` - универсальный конструктор КП в разделе «Недвижимость» с расширенными фильтрами подбора, предпросмотром/PDF, сохранением черновика в CRM, кнопкой «Выбрать все участки», исключением нулевой цены и корректной обработкой лотов (primary + все кадастры в КП)

#### `components/admin/admin-login-form.tsx`
**Форма входа в админ-панель**:
- React Hook Form + Zod валидация
- Поля: username, password
- Отправка POST запроса на `/api/admin/login`
- Обработка ошибок
- Редирект после успешного входа
- **Детальное логирование** в консоль

#### `components/admin/land-plot-importer.tsx` (Обновлено Январь 2026)
**Компонент автоматизированного импорта участков**:
- **Массовая загрузка**: выбор и одновременная обработка нескольких файлов (.xlsx, .pdf, .json, .csv).
- **Очередь импорта**: последовательная обработка с детальным прогресс-баром для каждого файла.
- **Интеллектуальный адрес**: опция автоматического сопоставления адреса НСПД с КЛАДР (разрешение поселков и районов).
- **Прогресс обработки**: визуализация этапов (Анализ -> Координаты -> Сохранение) с детальным логом по каждому участку.
- Парсинг данных через библиотеки `xlsx` и `pdfjs-dist`.
- Валидация данных и логирование результатов в БД.

#### `components/admin/import-logs-viewer.tsx`
**Просмотр логов импорта**:
- Список всех импортов с датами
- Детали каждого импорта
- Фильтрация по датам
- Статистика (успешных/неудачных)

#### `components/admin/proposal-pdf-view.tsx`
**Генератор коммерческих предложений**:
- Выбор участка из списка
- Ввод данных клиента
- Генерация PDF документа
- Предпросмотр перед скачиванием
- Использует библиотеку для работы с PDF

---

### Публичные компоненты (Calming дизайн)

#### `components/calming/header.tsx`
**Шапка сайта**:
- Логотип и название компании (Next.js `<Image>` с alt «БалтикЗемля»)
- Навигационное меню (Каталог, Новости, Преимущества, Контакты)
- Кнопка "Войти" (скрыта по требованию)
- Адаптивное меню для мобильных (Sheet):
  - Навигация, телефон
  - Кнопка «Записаться на просмотр» → Dialog с формой (ФИО, телефон, мессенджер, дата/время)
  - Соцсети — pill-кнопки в строчку (`flex-wrap`) с иконками (VK, Telegram, WhatsApp, YouTube, Instagram)
  - Данные соцсетей из `organization_settings`

#### `components/calming/hero-section.tsx`
**Hero секция главной страницы**:
- Крупный заголовок с призывом к действию
- Описание предложения
- Кнопка "Смотреть каталог"
- Фоновое изображение или градиент
- Анимации при загрузке

#### `components/calming/catalog-section.tsx` / `catalog-with-filters.tsx`
**Каталог земельных участков**:
- Сетка карточек участков
- Фильтры по:
  - Цене (от-до)
  - Площади (от-до)
  - Населенному пункту
  - Расстоянию до моря
- Поиск по названию
- Пагинация
- **Поддержка URL-фильтров (Январь 2026)**:
  - Проп `initialFilters` для предустановки фильтров из URL
  - Автоматическое раскрытие расширенных фильтров при наличии параметров
  - Поддерживаемые фильтры: `maxPrice`, `landStatus`, `installment`, `utilities`
- Карточка участка содержит:
  - Фото
  - Название
  - Цену
  - Площадь
  - Адрес
  - Кнопку "Подробнее"
- Просмотр карточки участка открывается в модальном окне (Dialog) на главной странице

#### `components/calming/search-filters.tsx`
**Компонент фильтрации** каталога:
- Инпуты для диапазонов (цена, площадь)
- Селекты для категорий
- Кнопка "Применить фильтры"
- Кнопка "Сбросить"

#### `components/calming/benefits-section.tsx`
**Секция преимуществ**:
- Динамический блок "Почему выбирают наши участки" (данные из Supabase)
- 2 большие карточки слева/справа (картинка, заголовок, текст, кнопка с URL, поддержка внешних ссылок)
- Центральная сетка (до 6 карточек): иконка (Lucide или картинка), заголовок, описание, цвет, порядок
- Полностью управляется из админки (вкладка Settings)

#### `components/calming/trust-section.tsx`
**Удалено**: блок "О регионе / Почему цены растут в Калининграде?" больше не используется на главной странице.

#### `components/calming/news-section.tsx`
**Блок новостей на главной**:
- Последние 3-6 новостей
- Превью новости:
  - Изображение
  - Заголовок
  - Краткое описание
  - Дата публикации
  - Кнопка "Читать далее"
- Просмотр новости открывается в модальном окне (Dialog) на главной странице

#### `components/calming/contact-section.tsx`
**Секция контактов**:
- Контактная форма (имя, телефон, пожелания)
- **Маска телефона** с форматом `+7 (___) ___-__-__`:
  - Префикс `+7` всегда сохраняется
  - Автоматическое форматирование при вводе
  - Замена `8` на `7` при вводе
  - Ограничение на 11 цифр (7 + 10)
- Отправка данных через Server Action `createLead`
- Карточки с контактной информацией (телефон, email, адрес, режим работы)
- Данные загружаются из `organization_settings`

#### `components/calming/footer.tsx`
**Подвал сайта**:
- Логотип и краткое описание
- Навигационные ссылки
- Контактная информация
- Социальные сети
- Copyright и юридическая информация
- **Популярные подборки (Январь 2026)**:
  - Ссылки на каталог с предустановленными фильтрами:
    - Участки под ИЖС → `/catalog?landStatus=ИЖС`
    - Участки в рассрочку → `/catalog?installment=yes`
    - Недорогие участки → `/catalog?maxPrice=500000`
    - Земля с газом и светом → `/catalog?utilities=full`
    - Инвестиционные участки → `/catalog?landStatus=СНТ`

#### `components/calming/login-dialog.tsx`
**Диалог входа** (не используется, т.к. вход через `/staff`):
- Форма логина в модальном окне
- Использовался ранее до скрытия входа

---

### Вспомогательные компоненты

#### `components/contact-form.tsx`
**Контактная форма** (старая версия, может дублировать calming/contact-section)

#### `components/header.tsx`, `footer.tsx`, `hero-section.tsx`, `catalog-section.tsx`, `benefits-grid.tsx`, `trust-section.tsx`
**Старые версии компонентов** (альтернативные дизайны):
- Используются в `/minimalist` и `/luxury` версиях
- Аналогичны calming компонентам но с другими стилями

#### `components/plots/callback-buttons.tsx`
**Кнопки обратного звонка** на странице участка:
- "Заказать звонок"
- "Оставить заявку"
- Открывают модальные окна с формами
- Отправка данных через Server Actions

#### `components/plots/directions-button.tsx` (Февраль 2026)
**Кнопка "Как проехать"** — клиентский компонент для построения маршрута до участка:
- Запрашивает геолокацию пользователя при клике
- Модальное окно с выбором навигатора: Яндекс Навигатор, Google Maps, 2GIS
- Разные URL-схемы для мобильных и десктопных устройств
- 2GIS URL: `https://2gis.ru/directions/points/FROM_LON,FROM_LAT|TO_LON,TO_LAT`
- Рендеринг модалки через `createPortal` в `document.body` (предотвращает дёрганье UI внутри `<Link>`)
- Используется на карточках каталога (`catalog-with-filters.tsx`) и на детальной странице участка
- Стиль: `bg-primary text-primary-foreground rounded-full` (зелёная кнопка)

#### `components/plots/similar-plots-slider.tsx`
**Карусель «Похожие участки»** — клиентский компонент:
- Горизонтальный скролл с `snap-x snap-mandatory`
- Кнопки ←/→ видны и на мобильных, и на десктопе
- Мобильные: `w-[85vw] snap-center` (один участок в центре)
- Десктоп: `w-[calc(33.333%-16px)] snap-start` (три в ряд)
- Градиентные индикаторы скролла на мобильных

#### `components/ui/floating-phone.tsx` (Февраль 2026)
**Плавающая кнопка «Позвонить»** — клиентский компонент:
- `fixed bottom-6 left-6`, зеркально кнопке чата (`FloatingChat`) справа
- Только мобильная версия (`md:hidden`)
- Стиль: `h-16 w-16 rounded-full bg-emerald-600 shadow-xl`
- Иконка `Phone` (Lucide), ссылка `tel:` на номер из `organization_settings`
- Добавлена в `app/layout.tsx`

#### `components/seo/plot-jsonld.tsx` (Февраль 2026)
**JSON-LD структурированные данные для участка**:
- Schema.org `RealEstateListing` (ранее `Product`)
- Вложенный `Product` с `Offer`, `additionalProperty` (площадь, статус, кадастр, коммуникации)
- Geo-координаты через `contentLocation` → `GeoCoordinates`
- Seller: `RealEstateAgent` «БалтикЗемля»
- Убран фейковый `aggregateRating`

#### `components/map/contacts-map.tsx` (Февраль 2026)
**Leaflet карта для страницы контактов**:
- Маркер офиса с кастомной иконкой (зелёный круг с MapPin)
- Popup с адресом
- Фиксированный zoom 16

#### `components/theme-provider.tsx`
**Провайдер темы** для переключения темной/светлой темы:
- Использует `next-themes`
- Обертка для всего приложения в layout.tsx

---

### UI компоненты (shadcn/ui)

Все файлы в `components/ui/` - это готовые компоненты из библиотеки shadcn/ui на базе Radix UI:

#### Основные компоненты:
- `button.tsx` - Кнопки всех стилей и размеров
- `input.tsx` - Текстовые поля
- `textarea.tsx` - Многострочные текстовые поля
- `select.tsx` - Выпадающие списки
- `checkbox.tsx` - Чекбоксы
- `radio-group.tsx` - Радио кнопки
- `switch.tsx` - Переключатели
- `label.tsx` - Метки для форм
- `form.tsx` - Формы с валидацией (React Hook Form)

#### Навигация и layout:
- `navigation-menu.tsx` - Навигационное меню
- `breadcrumb.tsx` - Хлебные крошки
- `sidebar.tsx` - Боковая панель
- `tabs.tsx` - Табы/вкладки
- `separator.tsx` - Разделители
- `scroll-area.tsx` - Прокручиваемая область

#### Оверлеи:
- `dialog.tsx` - Модальные окна
  - Настроены более плавные анимации открытия/закрытия (увеличены длительности overlay/content)
- `sheet.tsx` - Боковые панели (drawer)
- `drawer.tsx` - Нижние панели
- `popover.tsx` - Поповеры
- `tooltip.tsx` - Подсказки
- `hover-card.tsx` - Карточки при наведении
- `dropdown-menu.tsx` - Выпадающие меню
- `context-menu.tsx` - Контекстное меню
- `menubar.tsx` - Панель меню

#### Отображение данных:
- `card.tsx` - Карточки контента
- `table.tsx` - Таблицы
- `chart.tsx` - Графики (Recharts)
- `badge.tsx` - Значки/бейджи
- `avatar.tsx` - Аватары
- `skeleton.tsx` - Скелетоны загрузки
- `progress.tsx` - Прогресс бары
- `spinner.tsx` - Спиннеры загрузки

#### Обратная связь:
- `alert.tsx` - Уведомления (статичные)
- `toast.tsx` / `toaster.tsx` - Тосты (всплывающие уведомления)
- `sonner.tsx` - Альтернативная система тостов
- `alert-dialog.tsx` - Диалоги подтверждения
- `empty.tsx` - Пустые состояния

#### Формы (новые shadcn компоненты):
- `field.tsx` - Обертка для полей формы
- `input-group.tsx` - Группы инпутов
- `input-otp.tsx` - OTP коды
- `button-group.tsx` - Группы кнопок
- `item.tsx` - Элементы списков
- `kbd.tsx` - Клавиатурные сочетания

#### Другие:
- `accordion.tsx` - Аккордеоны
- `collapsible.tsx` - Сворачиваемые блоки
- `carousel.tsx` - Карусели (Embla)
- `calendar.tsx` - Календари (React Day Picker)
- `command.tsx` - Command palette (cmd+k)
- `slider.tsx` - Слайдеры
- `toggle.tsx` / `toggle-group.tsx` - Переключатели
- `aspect-ratio.tsx` - Соотношение сторон
- `resizable.tsx` - Изменяемые панели
- `pagination.tsx` - Пагинация

#### Hooks:
- `use-toast.ts` - Хук для тостов
- `use-mobile.tsx` - Хук для определения мобильного устройства

---

## 📂 Директория `lib/` - Утилиты и библиотеки

#### `lib/utils.ts`
**Утилитарные функции**:
- `cn()` - Функция для объединения Tailwind классов (clsx + tailwind-merge)
  - Используется повсеместно для условных стилей
- `formatDate(date: string)` - Форматирование даты в русский формат
  - Формат: "16 дек. 2024"
  - Используется в компонентах админ-панели для отображения дат создания
  - Добавлено в декабре 2024 при рефакторинге admin-dashboard

#### `lib/telegram.ts`
**Сервис Telegram уведомлений**:
- `getTelegramConfig()` - получение настроек бота из БД или env переменных
- `sendMessageToAdmin(message)` - отправка HTML сообщения администратору
- `sendMessageWithButtons(message, buttons)` - отправка с inline-кнопками
- `notifyNewApplication(data)` - уведомление о новой заявке
- `notifyAdminError(context, error)` - уведомление об ошибке
- `escapeHtml(text)` - экранирование HTML спецсимволов
- Поддержка HTML разметки (`<b>`, `<i>`, `<code>`, `<a>`)
- Fallback на env переменные если БД недоступна

#### `lib/parser.ts`
**RSS парсер новостей**:
- `parseNewsByKeywords(keywords)` - парсинг новостей по ключевым словам
- `getRssFeeds()` - список доступных RSS-лент
- `containsKeyword(text, keywords)` - проверка наличия ключевых слов
- `extractImageUrl(item)` - извлечение изображения из RSS
- `stripHtml(html)` - очистка HTML тегов
- **Источники**: РБК Недвижимость, ЦИАН, РИА, Новострой-М, Яндекс
- Проверка дубликатов по заголовку
- Сохранение как черновики в таблицу `news`
- Использует библиотеку `rss-parser`

#### `lib/nspd-service/` (Январь 2026)
**Сервис работы с НСПД (ЕГРН)**:
- `nspd-client.ts` - HTTP клиент для API nspd.gov.ru, конвертация координат EPSG:3857 → WGS84, расчет центроидов.
- `schemas.ts` - TypeScript схемы ответов NSPD и геометрии.
- `land-status-detector` - логика автоматического определения статуса земли (ИЖС/СНТ/ЛПХ) по кодам ВРИ.

#### `lib/vk-api.ts` (Январь 2026)
**Клиент VK API**:
- `publishPlotToVK(plot)` - публикация поста на стену группы.
- `deleteWallPost(postId)` - удаление поста.
- `uploadPhotoToVK(imageBuffer)` - загрузка фото в альбом группы.
- `VKRateLimiter` - ограничение частоты запросов.

#### `lib/indexnow.ts` (Февраль 2026)
**Хелпер IndexNow для быстрой индексации в Яндекс**:
- `submitToIndexNow(urls)` — отправка массива URL на `https://yandex.com/indexnow`
- Ключ из env `INDEXNOW_KEY`
- Вызывается из Server Actions при `createPlot`, `updatePlot`, `updateNews`

#### `lib/ok-api.ts` (Февраль 2026)
**Клиент Odnoklassniki API**:
- `publishPlotToOK(plot)` - публикация "медиатопика" в группу.
- `deleteGroupTopic(topicId)` - удаление топика.
- `uploadPhotoToGroup(imageBuffer)` - загрузка фото в альбом группы OK.
- `calculateSignature(params, secret)` - расчет подписи запроса по алгоритмам OK.
- `OKRateLimiter` - ограничение частоты запросов.

#### `lib/max-bot/` (Март 2026)
**Модуль MAX-бота (Фаза 1, MVP):**
- `index.ts` — инициализация `@maxhub/max-bot-api` и маршрутизация входящих событий
- `state.ts` — in-memory сессии пользователя (шаги фильтрации, выбранные фильтры, страница)
- `handlers/start.ts` — приветствие и запуск сценария поиска
- `handlers/search.ts` — выбор района, поиск в БД, пагинация, команда `/plot`
- `handlers/plot-detail.ts` — отправка детальной карточки участка
- `utils/db-query.ts` — запросы к `land_plots` через Supabase admin client
- `utils/format-plot.ts` — форматирование карточки и деталей участка
- `utils/keyboards.ts` — описание кнопок/клавиатур сценария
- `utils/max-api.ts` — отправка сообщений в MAX через `platform-api.max.ru`

#### `lib/types.ts`
**TypeScript типы** для всего проекта:

**Основные сущности:**
- `LandPlot` - тип земельного участка (ключевые поля карты: `coordinates_json`, `center_lat`, `center_lon`)
- `News` - тип новости
- `Lead` - тип заявки
- `Subscriber` - тип подписчика
- `User` - тип пользователя системы
- `AdminUser` - тип администратора
- `CommercialProposal` - тип коммерческого предложения
- `CommercialProposalWithDetails` - КП с деталями участков
- `OrganizationSettings` - настройки организации, включая:
  - Базовые контакты: organization_name, phone, email, address, logo_url
  - **Настройки шаблона КП (добавлено декабрь 2025)**:
    - `proposal_blocks_order` - JSON массив порядка блоков
    - `proposal_primary_color`, `proposal_accent_color`, `proposal_header_bg_color` - цвета
    - `proposal_font_family`, `proposal_custom_font_url` - шрифты
    - `proposal_header_font_size`, `proposal_body_font_size` - размеры шрифтов
    - `proposal_logo_size`, `proposal_show_logo`, `proposal_show_org_name` - логотип
    - `proposal_contacts_position`, `proposal_header_show_*` - контакты
    - `proposal_footer_text`, `proposal_show_footer` - футер
- `ImportLog` - тип лога импорта
- `LegalContent` - тип для контента страницы "Юридическая чистота"

**Адресные данные (актуально):**
- Справочники адресов берутся из таблиц `public.kladr_places` и `public.kladr_streets`.

**Константы:**
- `KALININGRAD_DISTRICTS` - список районов (устарело, заменено на БД)
- `AREA_OPTIONS` - опции площади для фильтров
- `LAND_STATUS_OPTIONS` - статусы земли (ИЖС, СНТ, ДНП, ЛПХ)
- `LEAD_STATUS_OPTIONS` - статусы заявок
- `LAND_PLOT_STATUS_OPTIONS` - статусы участков (активен/неактивен)

**Примечание:** Используется для типизации данных и интерфейсов.

---

### Supabase клиенты

#### `lib/supabase/client.ts`
**Клиент Supabase для браузера**:
- Использует `createBrowserClient` из `@supabase/ssr`
- Singleton паттерн (один экземпляр на всё приложение)
- Используется в Client Components
- Работает с публичными данными

#### `lib/supabase/server.ts`
**Клиент Supabase для сервера**:
- Использует `createServerClient` из `@supabase/ssr`
- Работает с cookies для сессий
- Используется в Server Components и Server Actions
- Поддержка аутентификации

#### `lib/supabase/admin.ts`
**Админ клиент Supabase**:
- Использует service role key для админских операций
- Обходит Row Level Security (RLS)
- Singleton паттерн
- **Критически важно**: НЕ использовать напрямую для админ-авторизации (вызывает множественные экземпляры GoTrueClient)

---

### Админ авторизация

#### `lib/admin-auth.ts`
**JWT-based система авторизации** для админ-панели:
- `createAdminSession(userId, username)` - генерация JWT токена
- `verifyAdminSession(token)` - проверка и декодирование токена
- `setAdminSessionCookie(token)` - установка cookie (если используется отдельной логикой)
- `getAdminSession()` - получение текущей сессии из cookie
- `clearAdminSessionCookie()` - удаление cookie при выходе
- Использует библиотеку `jose` для JWT
- Токены живут 7 дней
- HTTP-only cookies для безопасности
- **Не использует Supabase** - избегает конфликтов GoTrueClient

---

## 🔐 Система безопасности

### Аутентификация администратора

**Архитектура:**
1. **Вход**: `/staff` → `/admin/login` → POST `/api/admin/login`
2. **Проверка**: bcrypt.compare(password, hash_from_db)
3. **Токен**: JWT генерируется через `jose` библиотеку
4. **Сессия**: HTTP-only cookie `admin_session` (7 дней)
5. **Защита**: Middleware `middleware.ts` (делегирует в `proxy.ts`) проверяет токен на каждом `/admin/*` роуте
6. **Выход**: DELETE cookie + redirect

**Почему НЕ используется Supabase Auth:**
- Конфликт множественных экземпляров GoTrueClient
- Проблемы с cookies в Next.js middleware
- JWT-based подход проще и надежнее для админки

---

## 🚀 Запуск проекта

### Development:
```bash
npm run dev
```

### Production build:
```bash
npm run build
npm run start
```

### Доступ к админ-панели:
1. Перейти на `/staff`
2. Ввести логин: `admin`, пароль: `123`
3. Если не работает - перейти на `/admin/fix-password` и сбросить пароль

---

## 📊 База данных Supabase

### Обзор (локальная схема)

**Public tables:**
`admin_users`, `chat_sessions`, `chat_messages`, `commercial_proposals`, `commercial_proposal_plots`, `faq_items`, `import_logs`, `kladr_places`, `kladr_streets`, `land_plots`, `land_plot_images`, `landing_benefits_section`, `landing_benefit_items`, `leads`, `legal_content`, `news`, `organization_settings`, `plot_placeholders`, `rate_limit_events`, `settlement_descriptions`, `social_posts`, `social_settings`, `social_logs`, `subscribers`, `users`.

**Foreign keys (основные):**
- `land_plot_images.plot_id` → `land_plots.id` (ON DELETE CASCADE)
- `commercial_proposal_plots.plot_id` → `land_plots.id` (ON DELETE CASCADE)
- `commercial_proposal_plots.proposal_id` → `commercial_proposals.id` (ON DELETE CASCADE)
- `commercial_proposals.lead_id` → `leads.id` (ON DELETE CASCADE)
- `commercial_proposals.created_by` → `users.id`
- `landing_benefit_items.section_id` → `landing_benefits_section.id` (ON DELETE CASCADE)
- `chat_messages.session_id` → `chat_sessions.id` (ON DELETE CASCADE)

**RLS:**
- RLS включён для большинства таблиц.
- Публичное чтение обычно ограничено условиями (`is_active = true`, `is_published = true`).
- Админка для записи использует `SUPABASE_SERVICE_ROLE_KEY` (обходит RLS).

**Storage:**
- Bucket: `land-images` (public)
- Метаданные файлов: `storage.objects`
- Ссылки на изображения в БД: `public.land_plot_images.public_url` и `public.land_plots.image_url`

**Переменные окружения (важно для прод-сервера):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET` (подпись `admin_session`)
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID` (если включены уведомления)

### Структура таблиц

#### `land_plots` - Земельные участки
**Основная таблица каталога участков**

| Поле | Тип | Описание | Ограничения |
|------|-----|----------|-------------|
| `id` | UUID | Уникальный идентификатор | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `title` | VARCHAR(255) | Название участка | NOT NULL |
| `description` | TEXT | Описание участка | NULL |
| `price` | DECIMAL(15, 2) | Цена в рублях | NOT NULL |
| `area_sotok` | DECIMAL(10, 2) | Площадь в сотках | NOT NULL |
| `district` | VARCHAR(100) | Район Калининградской области | NOT NULL |
| `location` | VARCHAR(255) | Населенный пункт | NULL |
| `distance_to_sea` | DECIMAL(5, 1) | Расстояние до моря | NULL |
| `land_status` | VARCHAR(50) | Статус земли (ИЖС, СНТ, ДНП, ЛПХ) | DEFAULT 'ИЖС' |
| `has_gas` | BOOLEAN | Наличие газа | DEFAULT false |
| `has_electricity` | BOOLEAN | Наличие электричества | DEFAULT false |
| `has_water` | BOOLEAN | Наличие водоснабжения | DEFAULT false |
| `has_installment` | BOOLEAN | Возможность рассрочки | DEFAULT false |
| `image_url` | TEXT | URL основного изображения | NULL |
| `coordinates_json` | JSONB | Геометрия участка | NULL |
| `has_coordinates` | BOOLEAN | Есть ли координаты/контур | DEFAULT false |
| `center_lat` | DOUBLE PRECISION | Центр участка (lat, WGS84) | NULL |
| `center_lon` | DOUBLE PRECISION | Центр участка (lon, WGS84) | NULL |
| `is_featured` | BOOLEAN | Избранный участок | DEFAULT false |
| `is_active` | BOOLEAN | Активен ли участок | DEFAULT true |
| `cadastral_number` | VARCHAR(100) | Кадастровый номер | NULL |
| `created_at` | TIMESTAMPTZ | Дата создания | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | Дата обновления | DEFAULT NOW() |

**Индексы:**
- `idx_land_plots_district` - на поле `district`
- `idx_land_plots_price` - на поле `price`
- `idx_land_plots_area` - на поле `area_sotok`
- `idx_land_plots_active` - на поле `is_active`
- `idx_land_plots_has_coordinates` - на поле `has_coordinates`

**RLS политики:**
- Публичное чтение активных участков (`is_active = true`)
- Управление разрешено роли `authenticated` (в админ-панели используется service role key)

---

#### `news` - Новости и статьи
**Таблица новостей для публикации на сайте**

| Поле | Тип | Описание | Ограничения |
|------|-----|----------|-------------|
| `id` | UUID | Уникальный идентификатор | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `title` | TEXT | Заголовок новости | NOT NULL |
| `content` | TEXT | Содержание новости | NOT NULL |
| `image_url` | TEXT | URL изображения | NULL |
| `author` | TEXT | Автор новости | NULL |
| `is_published` | BOOLEAN | Опубликована ли новость | DEFAULT false |
| `published_at` | TIMESTAMPTZ | Дата публикации | NULL |
| `created_at` | TIMESTAMPTZ | Дата создания | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | Дата обновления | DEFAULT NOW() |

**Индексы:**
- `idx_news_published` - на полях `is_published, published_at DESC`

**RLS политики:**
- Публичное чтение опубликованных новостей (`is_published = true`)
- Полное управление для аутентифицированных пользователей

---

#### `leads` - Заявки от клиентов
**Таблица заявок (лидов) от посетителей сайта**

| Поле | Тип | Описание | Ограничения |
|------|-----|----------|-------------|
| `id` | UUID | Уникальный идентификатор | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `name` | VARCHAR(255) | Имя клиента | NOT NULL |
| `phone` | VARCHAR(50) | Телефон клиента | NOT NULL |
| `wishes` | TEXT | Пожелания клиента | NULL |
| `status` | VARCHAR(50) | Статус заявки | DEFAULT 'new' |
| `manager_comment` | TEXT | Комментарий менеджера | NULL |
| `assigned_to` | UUID | ID назначенного менеджера | NULL, REFERENCES users(id) |
| `created_at` | TIMESTAMPTZ | Дата создания | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | Дата обновления | DEFAULT NOW() |

**Возможные значения `status`:**
- `new` - Новая заявка
- `in_progress` - В работе
- `thinking` - Думает
- `sold` - Купил
- `rejected` - Отказ

**Индексы:**
- `idx_leads_status` - на поле `status`
- `idx_leads_created_at` - на поле `created_at DESC`

**RLS политики:**
- Публичное создание заявок
- Чтение и управление для аутентифицированных пользователей

---

#### `subscribers` - Подписчики на рассылку
**Таблица email подписчиков**

| Поле | Тип | Описание | Ограничения |
|------|-----|----------|-------------|
| `id` | UUID | Уникальный идентификатор | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `email` | VARCHAR(255) | Email адрес | NOT NULL, UNIQUE |
| `is_active` | BOOLEAN | Активна ли подписка | DEFAULT true |
| `created_at` | TIMESTAMPTZ | Дата подписки | DEFAULT NOW() |

**Индексы:**
- `idx_subscribers_email` - на поле `email`

**RLS политики:**
- Публичная подписка (INSERT)
- Чтение и управление для аутентифицированных пользователей

---

#### `users` - Пользователи системы
**Таблица пользователей (менеджеров и администраторов)**

| Поле | Тип | Описание | Ограничения |
|------|-----|----------|-------------|
| `id` | UUID | Уникальный идентификатор | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `email` | VARCHAR(255) | Email пользователя | NOT NULL, UNIQUE |
| `password_hash` | VARCHAR(255) | Хеш пароля (bcrypt) | NOT NULL |
| `name` | VARCHAR(255) | Имя пользователя | NOT NULL |
| `role` | VARCHAR(50) | Роль пользователя | DEFAULT 'manager' |
| `is_active` | BOOLEAN | Активен ли пользователь | DEFAULT true |
| `created_at` | TIMESTAMPTZ | Дата создания | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | Дата обновления | DEFAULT NOW() |

**Возможные значения `role`:**
- `admin` - Администратор
- `manager` - Менеджер

**Индексы:**
- `idx_users_email` - на поле `email`

**RLS политики:**
- Чтение для аутентифицированных пользователей
- Управление только для администраторов

**Начальные данные**:
- Админ по умолчанию: `admin@baltikzemlya.ru` / `admin123`

---

#### `admin_users` - Администраторы (JWT авторизация)
**Таблица для JWT-based авторизации администраторов**

| Поле | Тип | Описание | Ограничения |
|------|-----|----------|-------------|
| `id` | UUID | Уникальный идентификатор | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `username` | TEXT | Имя пользователя | NOT NULL, UNIQUE |
| `password_hash` | TEXT | Хеш пароля (bcrypt) | NOT NULL |
| `email` | TEXT | Email администратора | NULL |
| `name` | TEXT | Имя администратора | NULL |
| `is_active` | BOOLEAN | Активен ли администратор | DEFAULT true |
| `created_at` | TIMESTAMPTZ | Дата создания | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | Дата обновления | DEFAULT NOW() |

**Индексы:**
- `idx_admin_users_username` - на поле `username`

**Примечание:** Используется для JWT-based авторизации, не использует Supabase Auth для избежания конфликтов GoTrueClient.

**Дефолтный пользователь:**
- Username: `admin`
- Password: `123` (хеш: `$2a$10$rBV2KT4zZqHxqvVp4gPWxOehLYZ9YxX.HqGTqH9pZQ3ZQHkQN9kZa`)

---

#### `commercial_proposals` - Коммерческие предложения
**Таблица коммерческих предложений для клиентов**

| Поле | Тип | Описание | Ограничения |
|------|-----|----------|-------------|
| `id` | UUID | Уникальный идентификатор | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `lead_id` | UUID | ID заявки (лида) | NOT NULL, REFERENCES leads(id) ON DELETE CASCADE |
| `title` | TEXT | Название КП | NOT NULL |
| `description` | TEXT | Описание КП | NULL |
| `status` | TEXT | Статус КП | DEFAULT 'draft', CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected')) |
| `created_by` | UUID | ID создателя | NULL, REFERENCES users(id) |
| `created_at` | TIMESTAMPTZ | Дата создания | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | Дата обновления | DEFAULT NOW() |
| `sent_at` | TIMESTAMPTZ | Дата отправки | NULL |

**Возможные значения `status`:**
- `draft` - Черновик
- `sent` - Отправлено
- `viewed` - Просмотрено
- `accepted` - Принято
- `rejected` - Отклонено

**Индексы:**
- `idx_commercial_proposals_lead_id` - на поле `lead_id`
- `idx_commercial_proposals_status` - на поле `status`

**RLS политики:**
- Полное управление для service role

---

#### `commercial_proposal_plots` - Связь КП с участками
**Junction таблица (many-to-many) для связи коммерческих предложений с участками**

| Поле | Тип | Описание | Ограничения |
|------|-----|----------|-------------|
| `id` | UUID | Уникальный идентификатор | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `proposal_id` | UUID | ID коммерческого предложения | NOT NULL, REFERENCES commercial_proposals(id) ON DELETE CASCADE |
| `plot_id` | UUID | ID участка | NOT NULL, REFERENCES land_plots(id) ON DELETE CASCADE |
| `sort_order` | INTEGER | Порядок сортировки | DEFAULT 0 |
| `custom_note` | TEXT | Дополнительная заметка | NULL |
| `created_at` | TIMESTAMPTZ | Дата создания | DEFAULT NOW() |

**Ограничения:**
- UNIQUE(`proposal_id`, `plot_id`) - один участок может быть в КП только один раз

**Индексы:**
- `idx_commercial_proposal_plots_proposal_id` - на поле `proposal_id`
- `idx_commercial_proposal_plots_plot_id` - на поле `plot_id`

**RLS политики:**
- Полное управление для service role

---

#### `organization_settings` - Настройки организации
**Таблица настроек организации (одна запись с фиксированным ID)**

| Поле | Тип | Описание | Ограничения |
|------|-----|----------|-------------|
| `id` | UUID | Уникальный идентификатор | PRIMARY KEY, фиксированный: `00000000-0000-0000-0000-000000000001` |
| `organization_name` | TEXT | Название организации | NOT NULL |
| `phone` | TEXT | Телефон | NOT NULL |
| `email` | TEXT | Email | NOT NULL |
| `address` | TEXT | Адрес | NOT NULL |
| `logo_url` | TEXT | URL логотипа | NULL |
| `working_hours` | TEXT | График работы | NOT NULL |
| `show_cadastral_number` | BOOLEAN | Показывать кадастровый номер в КП | DEFAULT false |
| `show_price` | BOOLEAN | Показывать цену в КП | DEFAULT true |
| `show_area` | BOOLEAN | Показывать площадь в КП | DEFAULT true |
| `show_district` | BOOLEAN | Показывать район в КП | DEFAULT true |
| `show_location` | BOOLEAN | Показывать местоположение в КП | DEFAULT true |
| `show_status` | BOOLEAN | Показывать статус земли в КП | DEFAULT true |
| `show_amenities` | BOOLEAN | Показывать коммуникации в КП | DEFAULT true |
| `show_image` | BOOLEAN | Показывать изображение в КП | DEFAULT true |
| `show_social_media` | BOOLEAN | Показывать соц. сети | DEFAULT false |
| `show_vk` | BOOLEAN | Показывать ВКонтакте | DEFAULT false |
| `vk_url` | TEXT | URL ВКонтакте | NULL |
| `show_telegram` | BOOLEAN | Показывать Telegram | DEFAULT false |
| `telegram_url` | TEXT | URL Telegram | NULL |
| `show_whatsapp` | BOOLEAN | Показывать WhatsApp | DEFAULT false |
| `whatsapp_url` | TEXT | URL WhatsApp | NULL |
| `show_youtube` | BOOLEAN | Показывать YouTube | DEFAULT false |
| `youtube_url` | TEXT | URL YouTube | NULL |
| `show_instagram` | BOOLEAN | Показывать Instagram | DEFAULT false |
| `instagram_url` | TEXT | URL Instagram | NULL |
| `created_at` | TIMESTAMPTZ | Дата создания | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | Дата обновления | DEFAULT NOW() |

**Примечание:** Таблица содержит одну запись с фиксированным ID для хранения глобальных настроек организации.

---

#### `import_logs` - Логи импорта данных
**Таблица логов импорта участков из файлов**

| Поле | Тип | Описание | Ограничения |
|------|-----|----------|-------------|
| `id` | UUID | Уникальный идентификатор | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `settlement` | TEXT | Населенный пункт | NOT NULL |
| `file_name` | TEXT | Имя импортированного файла | NOT NULL |
| `file_type` | TEXT | Тип файла (PDF, Excel, CSV, JSON) | NOT NULL |
| `imported_at` | TIMESTAMPTZ | Дата импорта | DEFAULT NOW() |
| `added_count` | INTEGER | Количество добавленных участков | DEFAULT 0 |
| `updated_count` | INTEGER | Количество обновленных участков | DEFAULT 0 |
| `archived_count` | INTEGER | Количество архивированных участков | DEFAULT 0 |
| `details` | JSONB | Детали импорта (массив объектов) | NULL |

**Структура `details` (JSONB):**
```json
[
  {
    "cadastral_number": "39:01:000000:0000",
    "operation": "added" | "updated" | "archived" | "error",
    "settlement": "пос. Поддубное"
  }
]
```

**Примечание:** Используется для отслеживания истории импорта участков и отладки проблем импорта.

---

#### Таблица `legal_content` - Контент для страницы "Юридическая чистота"
**Таблица для хранения динамического контента страницы `/legal`**

| Поле | Тип | Описание | Ограничения |
|------|-----|----------|-------------|
| `id` | UUID | Уникальный идентификатор | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `title` | TEXT | Заголовок раздела/блока | NOT NULL |
| `content` | TEXT | Основной текстовый контент (поддержка Markdown) | NULL |
| `image_url` | TEXT | URL изображения для блока | NULL |
| `pdf_url` | TEXT | URL PDF-файла для скачивания | NULL |
| `sort_order` | INTEGER | Порядок отображения блоков | DEFAULT 0 |
| `is_active` | BOOLEAN | Активен ли блок | DEFAULT true |
| `created_at` | TIMESTAMPTZ | Дата создания | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | Дата обновления | DEFAULT NOW() |

**Индексы:**
- `idx_legal_content_sort_order` - на поле `sort_order`

**RLS политики:**
- Публичное чтение активных блоков (`is_active = true`)
- Полное управление для аутентифицированных пользователей

---

### Связи между таблицами

```
leads (1) ──< (N) commercial_proposals
commercial_proposals (1) ──< (N) commercial_proposal_plots >── (N) land_plots
users (1) ──< (N) commercial_proposals (created_by)
users (1) ──< (N) leads (assigned_to)
```

---

### Таблицы (краткий список):
- **land_plots** - Земельные участки (основная таблица)
- **settlement_descriptions** - Описания поселков
- **social_posts** - Записи о публикациях в соцсетях (vk, ok)
- **social_settings** - Настройки публикаций (enabled, limit, time)
- **social_logs** - Логи действий с соцсетями
- **subscribers** - Подписчики на рассылку

### Environment variables:
- `NEXT_PUBLIC_SUPABASE_URL` - URL проекта Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Публичный ключ
- `SUPABASE_SERVICE_ROLE_KEY` - Сервисный ключ (админ)
- `POSTGRES_URL` - Прямое подключение к PostgreSQL
- `BLOB_READ_WRITE_TOKEN` - Токен для Vercel Blob

---

## 🎨 Дизайн система

### Цветовая схема (Tailwind CSS 4):
- **Background**: Основной фон
- **Foreground**: Текст
- **Primary**: Акцентный цвет (кнопки, ссылки)
- **Secondary**: Вторичный цвет
- **Muted**: Приглушенные элементы
- **Accent**: Выделение
- **Destructive**: Опасные действия
- **Border**: Границы
- **Input**: Поля ввода
- **Ring**: Focus состояния
- **Chart**: Цвета графиков

### Шрифты:
- **Sans**: Geist Sans (основной)
- **Mono**: Geist Mono (код)

### Breakpoints:
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

---

## 📈 Аналитика

**Vercel Analytics** подключена в `app/layout.tsx`:
- Отслеживание pageviews
- Web Vitals метрики
- Автоматический сбор данных

---

## 🔧 Технологический стек

### Frontend:
- Next.js 16 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui
- Radix UI
- Lucide Icons

### Backend:
- Next.js API Routes
- Server Actions
- Supabase (PostgreSQL)
- bcryptjs (хеширование)
- jose (JWT)

### Инструменты:
- xlsx (Excel импорт)
- pdfjs-dist (PDF просмотр)
- React Hook Form (формы)
- Zod (валидация)
- date-fns (даты)

---

## 📝 Ключевые особенности проекта

1. **Полностью серверный рендеринг** - Next.js 16 App Router
2. **JWT-based админ-панель** - без Supabase Auth
3. **Row Level Security** - защита данных на уровне базы
4. **Адаптивный дизайн** - mobile-first подход
5. **SEO оптимизация** - метаданные, sitemap, robots.txt
6. **Импорт из Excel** - массовая загрузка участков
7. **Генерация PDF** - коммерческие предложения
8. **Детальное логирование** - для отладки админки

---

## 🐛 Известные проблемы и решения

### Проблема: Множественные экземпляры GoTrueClient
**Решение**: Не использовать Supabase клиент для админ-авторизации, использовать JWT через `lib/admin-auth.ts`

### Проблема: Bcrypt хеш не проходит проверку
**Решение**: Использовать страницу `/admin/fix-password` и сбросить пароль

### Проблема: Cookie не устанавливается в middleware
**Решение**: Устанавливать cookie в API route, а не в middleware

### Проблема: RLS блокирует чтение публичных данных
**Решение**: Проверить политики в скриптах `004-006`

---

## 📞 Поддержка

Для вопросов и проблем:
1. Проверить документацию в `ADMIN_ACCESS.md`
2. Проверить логи в консоли браузера (детальное логирование включено)
3. Использовать `/admin/fix-password` для сброса доступа
4. Проверить environment variables в Vercel

---

---

## 🔄 История изменений

### Декабрь 2024 - Рефакторинг админ-панели

**Проблема**: Компонент `admin-dashboard.tsx` был слишком большим (1973 строки), что затрудняло поддержку и разработку.

**Решение**: Разбиение на логические компоненты в директории `components/admin/dashboard/`:
- `stats-overview.tsx` - статистика дашборда
- `plots-tab.tsx` - управление участками
- `news-tab.tsx` - управление новостями
- `leads-tab.tsx` - управление заявками
- `subscribers-tab.tsx` - управление подписчиками
- `users-tab.tsx` - управление пользователями
- `settings-tab.tsx` - настройки организации

**Результат**:
- Улучшена читаемость и поддерживаемость кода
- Каждый компонент отвечает за свою функциональность
- Упрощено тестирование отдельных частей
- `admin-dashboard.tsx` теперь выполняет роль оркестратора (управление состоянием и маршрутизация)

**Дополнительные изменения**:
- Добавлена функция `formatDate()` в `lib/utils.ts` для единообразного форматирования дат
- Исправлена иконка в `UsersTab` (Plus вместо Edit)
- Все компоненты используют единый подход к пропсам и обработчикам событий

---

### Декабрь 2025 - Рефакторинг импорта участков (вкладка «Импорт»)

**Цель**: сделать импорт участков управляемым и безопасным: строго по выбранному поселку (через классификатор), с синхронизацией, логами и инструментом очистки.

**Изменения в UI админки**:
- Добавлена отдельная вкладка **«Импорт»** в админ-панели.
- Импорт требует обязательного выбора **района + населенного пункта** через `AddressCombobox`.
- Добавлена **шкала прогресса** импорта в окне подтверждения (Dialog выбора района/поселка).
- Добавлена кнопка **«Удалить участки (по поселку)»** и окно очистки выбранного поселка.

**Новые/обновленные компоненты**:
- `components/admin/dashboard/import-tab.tsx` - вкладка «Импорт» (импорт + логи + очистка поселка)
- `components/admin/land-plot-importer.tsx` - импорт CSV/JSON/XLSX/PDF, выбор района/поселка, прогресс
- `components/admin/import-logs-viewer.tsx` - просмотр логов импорта по датам, поддержка `error/skipped` и `message`
- `components/admin/dashboard/clear-settlement-dialog.tsx` - диалог очистки участков выбранного поселка

**Server Actions / API**:
- `app/actions.ts`:
  - `syncLandPlotsFromData(...)` - синхронизация участков по поселку (added/updated/archived/error/skipped) + запись `import_logs`
  - `clearLandPlotsBySettlement(district, settlement)` - удаление всех участков выбранного поселка + запись `import_logs`
  - Автоприменение заглушек: для участков без изображений назначается `plot_placeholders` как обложка
- `app/api/import-logs/*` - выдача логов импорта и дат

**Скрипты**:
- `scripts/014-clear-land-plots.sql` - полная очистка таблицы `land_plots` (с каскадным удалением зависимостей)
- `scripts/generate-kupiprodai-xml.ts` - формирует файл `kupiprodai-plots.xml` по заданному списку кадастровых номеров (с fallback на `land_plot_images` для картинок)

---

### Январь 2026 - Интеграция НСПД и Интерактивная карта

**Цель**: Автоматизация сбора данных об участках и визуализация всего портфеля на карте.

**Изменения**:
- **NSPD Интеграция**: Автоматическое получение контуров участков и определение статуса земли (ИЖС/СНТ) по кадастровому номеру.
- **Интерактивная карта**: Переход от отображения одного участка к «карте всех объектов» с фильтрацией по поселкам и тултипами при наведении.
- **Inline UI**: Отказ от боковых панелей при редактировании в пользу раскрывающихся списков (Accordion-style).
 - **Чистка БД**: устаревшая заметка. В текущей локальной схеме поля `distance_to_sea` и `image_url` присутствуют.

 ### Январь 2026 - Комплексные лоты (bundle)

 **Статус**: историческое/план. В текущей локальной схеме `public.land_plots` bundle-поля отсутствуют.

**Изменения**:
- В БД добавлены поля: `bundle_id`, `is_bundle_primary` (+ индексы и ограничения).
- В каталоге показывается только primary (`is_bundle_primary=true`), но агрегируется список кадастров и суммарная площадь.
- На странице участка показывается список кадастровых номеров группы с пометками права (собственность/аренда/бронь).
- На карте: общий контур (stroke) по `bundle_polygon_color`, но заливка (fill) каждого участка — по его статусу (ownership/lease/reserved).

### Январь 2026 - FAQ Management System

**Цель**: Создание полноценной системы управления часто задаваемыми вопросами и интеграция её с системой лидов.

**Изменения**:
- **CRUD FAQ**: Полное управление вопросами, ответами и категориями из админ-панели (`FaqTab`).
- **Сортировка**: Возможность изменения порядка отображения вопросов.
- **Публичная страница**: Создание `/faq` с аккордеонами и встроенной формой обратной связи.
- **Интеграция с лидами**: Вопросы из FAQ попадают в общую базу заявок с типом `faq`, подсвечиваются в админке фиолетовым и отправляют специфические уведомления в Telegram.

### Система управления разделом "Юридическая чистота"
- Создана таблица `legal_content` в БД.
- Реализована админка для добавления текстов, изображений и PDF-файлов.
- Создана публичная страница `/legal` с современным дизайном.
- Бейдж в Hero-секции связан с новой страницей.
- Реализован универсальный API для загрузки файлов в админке.

**Date**: 2026-01-06
**Version**: 1.5.0

### Февраль 2026 - Кнопка "Как проехать" и плавная карта

**Цель**: Улучшение UX каталога и карты.

**Изменения**:
- **Кнопка "Как проехать"**: Добавлена на карточки каталога и детальную страницу участка. Запрашивает геолокацию, предлагает выбор навигатора (Яндекс, Google Maps, 2GIS). Модалка через `createPortal`.
- **Статус земли на карточках**: Бейдж ИЖС/Пром перенесён с изображения в секцию характеристик.
- **Адаптивный зум карты**: Кастомный `AdaptiveScrollZoom` — скорость зума пропорциональна скорости прокрутки колёсика.
- **CSS-анимации карты**: Плавные переходы тайлов, маркеров, кластеров, полигонов. Keyframes для кластеров.
- **MarkerPaneFader**: Плавный fade маркеров при переходе к полигонам (zoom 15→16).
- **Полигоны**: Динамическая прозрачность и толщина обводки по уровню зума (ramp 14→16).
- **flyTo**: Увеличена длительность до 1.2s с мягким easing.

### Февраль 2026 - SEO-оптимизация, страница контактов, кастомная 404

**Цель**: Улучшение позиций в Google и Яндекс, расширение публичных страниц.

**Изменения**:
- **JSON-LD**: `Product` → `RealEstateListing` с geo, коммуникациями, кадастром (`components/seo/plot-jsonld.tsx`)
- **Метаданные**: canonical URL, OG-image на всех публичных страницах
- **Изображения**: `unoptimized` убран, AVIF/WebP, кеш 30 дней, `<img>` → `<Image>`
- **IndexNow**: `lib/indexnow.ts` + API routes, автоотправка при создании/обновлении контента
- **ISR**: `revalidate = 3600` на страницах участков и новостей
- **Контакты**: `/contacts` — телефон, email, адрес, карта Leaflet, JSON-LD
- **404**: Кастомная страница с навигацией и Header/Footer
- **Sitemap**: добавлены `/contacts`, `/about`

**Дата последнего обновления**: 9 февраля 2026  
**Версия проекта**: 0.4.0  
**React**: 19.2.0

---

## Режим разработки: локальный сайт + продовая Supabase БД (единая база dev/prod)

В проекте поддерживается режим, когда **локальный фронтенд** запускается на `http://localhost:3000`, но подключается к **продовой Supabase** (VPS) по `https://api.baltland.ru`.

**Зачем**:
- Telegram 2FA в админке работает только с публичным вебхуком (например, `https://baltland.ru/api/telegram/webhook`).
- Если локальный сайт подключён к той же Supabase, что и прод, то OTP/привязки Telegram и данные админки читаются/пишутся в **одной базе**, и вход через 2FA работает локально.

### Как включить

В `.env.local` на ноутбуке укажи продовые значения:
- `NEXT_PUBLIC_SUPABASE_URL=https://api.baltland.ru`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY с продовой Supabase>`
- `SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY с продовой Supabase>`

Webhook Telegram при этом остаётся продовым:
- `https://baltland.ru/api/telegram/webhook`

### Важно (риски)

- Любые операции записи в Supabase из локального кода будут писать **в продовую базу**.
- Для безопасной разработки избегай тестовых удалений/очисток и используй фичи/тестовые аккаунты.

### Правило изменений БД

- Схему БД (таблицы/колонки/индексы/RLS) изменяем **только миграциями** (SQL в репозитории).
- Деплой кода (web) можно делать независимо от БД.
- Обновление БД на проде выполняется отдельно и осознанно (например, отдельной командой/флагом), чтобы избежать случайного «переприменения»/сидинга.

---

### Февраль 2026 - Интеграция Одноклассников и рефакторинг соцсетей

**Цель**: Расширение охвата в соцсетях и унификация механизмов публикации.

**Изменения**:
- **Odnoklassniki API Integration**: Создан клиент `lib/ok-api.ts` с поддержкой медиатопиков и загрузки фото.
- **Унификация**: Созданы общие таблицы `social_posts`, `social_settings` и `social_logs` для всех платформ.
- **Интерфейс**: Создан `PublicationsTab` с переключением между VK и OK.
- **Автоматизация**: Реализованы cron-задачи для автопубликации в обе соцсети с соблюдением лимитов.
- **Статистика**: Расширен API `social/stats` для отображения прогресса по обеим платформам.
