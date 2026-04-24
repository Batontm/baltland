# PROGRESS.md — История изменений проекта Baltland.ru

> Этот файл ведётся постоянно. После каждого значимого изменения добавляется запись.

---

## Апрель 2026

### 2026-04-24 — Чистка репозитория и обновление документации

**Чистка корня проекта**:
- Удалены 17 git-tracked файлов: дебаг-утилиты (`app/debug-action.ts`, `app/debug-parser.ts`, `app/inspect-db.ts`), бэкап `app/actions.ts.bak`, разовые скрипты в корне (`check-schema.ts`, `migrate-full.js`, `setup-db.js`, `test-vk.js`, `compare_prices.py`, `make_csv.py`, `analyze_missing_geo.sh`, `map_settlements.sh`), временные MD-отчёты (`investigation_results.md`, `restoration_report.md`, `bundled_plots_report.md`, `LAND_PLOTS_IMPORTS_AND_NSPD.md`), `plots.data`
- Удалены ~35 untracked отчётов импорта (CSV/JSON/TXT)
- Дампы БД (91 МБ: `dump.sql`, `dump1.data`, `pgdata.tgz`, `storage-data.tgz`) перемещены в `~/Backups/rkkland/`
- Результат: корень проекта сократился со 100+ файлов до 29

**Документация**:
- `PROJECT_STRUCTURE.md` — удалены ссылки на несуществующий `ADMIN_ACCESS.md`, исправлены описания страниц `/plots/[id]` и `/news/[id]` (теперь 301-редиректы), добавлены актуальные SEO-пути (`/[district]/[settlement]/[slug]`, `/uchastok/[slug]`) и блог
- `DEPLOY.md` — команда деплоя обновлена на `bash scripts/deploy.sh` (была устаревшая `deploy_docker.sh`)

### 2026-04-07 — Переход на Magic Link авторизацию (вместо Telegram OTP)

**Файлы**:
- `lib/email.ts` — новый модуль для отправки email через Nodemailer + Gmail SMTP
- `app/api/admin/login/route.ts` — отправка magic-link токена на email вместо Telegram OTP
- `app/api/admin/login/magic/route.ts` — новый endpoint для верификации magic-link токена
- `components/admin/admin-login-form.tsx` — упрощён до ввода email/пароля с сообщением «проверьте почту»
- `app/admin/login/page.tsx` — отображение ошибки из query-параметра

**Env-переменные**: добавлены `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` в `.env.local` и на сервере.

### 2026-04-07 — Odnoklassniki API: активация приложения

**Контекст**: Команда OK API (Никита) активировала приложение `БалтикЗемля` (App ID `512004487254`) для работы REST API.

**Статус**: Приложение активно, но потребовалось обновить `OK_ACCESS_TOKEN` через OAuth-флоу (`/api/ok-callback`). Redirect URI `https://baltland.ru/api/ok-callback` нужно добавить в настройках приложения на `dev.vk.com` (OK мигрировал управление приложениями туда).

**Файлы**:
- `lib/ok-api.ts` — клиент OK API (mediatopic.post, uploadPhoto, users.getCurrentUser)
- `app/api/test-ok/route.ts` — диагностический endpoint для тестирования API и OAuth
- `app/api/ok-callback/route.ts` — OAuth-флоу авторизации приложения

---

## Февраль 2026

### 2026-02-17 — Промо «Геодезия в подарок» на главной

- `app/page.tsx` — блок новостей заменён на промо-секцию с картинкой и кнопкой «Подробнее»
- `components/calming/geodesy-promo-section.tsx` — новый промо-блок с CTA → `/geodesy`
- `app/geodesy/page.tsx` — добавлена страница подробного описания
- `public/geodesy-promo.jpeg` — промо-изображение для секции и страницы
- `app/cadastral-discount/page.tsx` — добавлена страница акции «Скидка 50% на кадастровые услуги»
- `public/geodesy-promo-2.jpeg` — второе промо-изображение
- Админка (Настройки) — добавлено управление двумя промо-плашками с кадрированием (как аватарка) и загрузкой в Supabase Storage
- `components/admin/dashboard/settings/home-promo-card.tsx` — новый UI для загрузки/кадра промо
- `app/api/admin/upload/route.ts` — добавлен тип `home-promo` → путь `home/promo/*`

### 2026-02-16 — Оптимизация hero-изображения для LCP (мобильные)

- `public/kaliningrad-map-hero.webp` — уменьшено разрешение с 1024×1024 до 768×768, сжатие WebP (quality 72)
- Цель: ускорить LCP/FCP на мобильных в PageSpeed Insights

### 2026-02-10 — PageSpeed: оптимизация производительности и доступности

**Проблема**: Lighthouse показал Performance 28 (mobile), TTFB ~970мс, TBT 2200мс, Accessibility 85.

**Оптимизация TTFB**:
- `app/page.tsx` — `force-dynamic` → `revalidate = 60` (ISR кэш 60 сек)
- `app/catalog/[[...slug]]/page.tsx` — добавлен `revalidate = 60`
- `app/faq/page.tsx` — `force-dynamic` → `revalidate = 300`
- `app/legal/page.tsx` — `force-dynamic` → `revalidate = 300`
- Результат: TTFB снизился с ~970мс до ~490мс (curl)

**Оптимизация JS bundle**:
- `components/lazy-widgets.tsx` — новый компонент, lazy-load FloatingChat, FloatingPhone, YandexMetrika, CookieConsent через `next/dynamic` с `ssr: false`
- `app/layout.tsx` — заменены прямые импорты на `<LazyWidgets />`
- Результат: Unused JS сократился со 102 КБ до 77 КБ

**Оптимизация изображений**:
- `components/calming/catalog-with-filters.tsx` — добавлены `loading="lazy"` и `sizes` на карточки участков (grid и list view)
- `components/calming/news-section.tsx` — добавлены `loading="lazy"` и `sizes` на карточки новостей

**Accessibility (a11y)**:
- `components/calming/header.tsx` — `aria-label="Открыть меню"` на кнопку мобильного меню
- `components/calming/catalog-with-filters.tsx` — `aria-label` на кнопки переключения вида (Сетка/Список)
- `components/calming/footer.tsx` — `aria-label` на email-инпут подписки
- `components/ui/address-combobox.tsx` — `aria-label` на trigger-кнопку (fallback на placeholder)
- `components/chat/floating-chat.tsx` — `aria-label` на все кнопки и textarea чата
- `components/ui/cookie-consent.tsx` — улучшен контраст кнопки закрытия (slate-400 → slate-600)

### 2026-02-09 — SEO: исправление «малочитаемых» страниц в Яндекс.Вебмастере

**Проблема**: Яндекс пометил `/catalog/do500`, `/catalog/electricity`, `/catalog/gaz`, `/catalog/lph`, `/catalog/sea`, `/catalog/water` как «малочитаемые или маловостребованные», `/faq` как «неконическую».

**Исправление**:
- `config/seo-pages.ts` — добавлено поле `seoText` с уникальным HTML-текстом для каждой SEO-страницы каталога (ИЖС, СНТ, ЛПХ, газ, свет, вода, море, до 500тыс)
- `app/catalog/[[...slug]]/page.tsx` — рендерится `seoText` из SEO_PAGES конфига (приоритет над settlement_descriptions)
- `app/faq/page.tsx` — добавлены Header и Footer (ранее страница была без навигации)

### 2026-02-09 — Исправление favicon (ёлочка вместо apple-icon)

- `app/layout.tsx` — apple touch icon теперь указывает на `/favicon.ico` (ёлочка), чтобы в Google/вкладке не показывалась старая apple-иконка

### 2026-02-09 — Мобильная оптимизация, UX-улучшения, производительность карты

**Мобильный каталог — ленивая загрузка**
**Файл**: `components/calming/catalog-with-filters.tsx`
- На мобильных (< 768px) каталог участков скрыт до нажатия кнопки «Показать N участков»
- Кнопка отображает актуальное количество отфильтрованных участков
- При смене фильтров (район, посёлок) каталог снова скрывается
- На десктопе — без изменений, каталог всегда виден
- Состояния: `mobileShowCatalog`, `isMobileView` (resize listener)

**Мобильное меню — кнопка записи и соцсети**
**Файл**: `components/calming/header.tsx`
- Добавлена кнопка «Записаться на просмотр» в мобильное меню (Sheet)
- При нажатии открывается Dialog с формой записи (ФИО, телефон, мессенджер, дата/время)
- Форма отправляет данные через `/api/public/viewing-lead`
- Добавлены соцсети в мобильное меню — pill-кнопки в строчку (`flex-wrap`) с иконками и названиями (VK, Telegram, WhatsApp, YouTube, Instagram)
- Данные соцсетей из `organization_settings`
- Исправлена JSX-структура: return обёрнут в `<>...</>` для Dialog вне `<header>`

**Плавающая кнопка «Позвонить»**
**Файл**: `components/ui/floating-phone.tsx` (новый)
- Круглая кнопка `fixed bottom-6 left-6` — зеркально кнопке чата справа
- Только мобильная (`md:hidden`), стиль идентичен чату (`h-16 w-16 bg-emerald-600`)
- Иконка Phone, ссылка `tel:` на номер из `organization_settings`
- Добавлена в `app/layout.tsx` рядом с `FloatingChat`

**Единый стиль кнопок действий**
**Файлы**: `components/plots/callback-buttons.tsx`, `components/plots/directions-button.tsx`
- Кнопки «Записаться на просмотр» и «Как проехать» теперь зелёные с белым текстом (primary)
- Ранее: outline/серые. Теперь все три кнопки (Позвонить, Записаться, Как проехать) одного стиля

**Карусель «Похожие участки» на мобильных**
**Файл**: `components/plots/similar-plots-slider.tsx`
- Кнопки ←/→ теперь видны на мобильных (убран `hidden md:flex`)
- Карточки: `w-[85vw]` на мобильных, `snap-center` для центрирования
- Стиль кнопок как в новостях: `bg-background/95 backdrop-blur-sm`

**Оптимизация производительности карты**
**Файл**: `components/map/leaflet-catalog-map.tsx`
- **Полигоны только при zoom ≥ 14** — ранее все 2000+ SVG-полигонов были в DOM при любом зуме
- **Viewport culling** — рендерятся только полигоны в видимой области (`mapBounds.pad(0.3)`)
- **Убрана CSS-анимация `d 0.3s`** на SVG path — вызывала massive repaints
- **Отключены hover-события на touch-устройствах** — `mouseover`/`mouseout` не вешаются на мобильных
- **Отключён spiderfy** (`spiderfyOnMaxZoom={false}`) — кластеры зумятся, а не раскрываются паучком
- **`animateAddingMarkers={false}`** — убрана анимация добавления маркеров
- `ZoomTracker` расширен: отслеживает `moveend` и передаёт `bounds`

**Accessibility**
**Файл**: `components/admin/admin-layout.tsx`
- Добавлены `SheetTitle` и `SheetDescription` (sr-only) для Radix UI accessibility

### 2026-02-09 — SEO-оптимизация (Google + Яндекс), страница контактов

**SEO: Структурированные данные (JSON-LD)**
- `components/seo/plot-jsonld.tsx` — `Product` → `RealEstateListing` с geo-координатами, коммуникациями, кадастром
- `app/layout.tsx` — убран фейковый `aggregateRating`, убран нерабочий `SearchAction`
- `app/contacts/page.tsx` — JSON-LD `ContactPage` schema
- FAQ, BreadcrumbList, ItemList — уже были реализованы ранее

**SEO: Метаданные и canonical**
- `app/news/[id]/page.tsx` — canonical URL, strip HTML из description, бренд → «БалтикЗемля»
- `app/catalog/[[...slug]]/page.tsx` — OG-image
- `app/about/page.tsx` — canonical, OG, Header/Footer, breadcrumbs
- `app/contacts/page.tsx` — полные метаданные

**SEO: Оптимизация изображений**
- `next.config.mjs` — `unoptimized: true` убран, добавлены AVIF/WebP форматы, кеш 30 дней
- `next.config.mjs` — `*.supabase.co` добавлен в `remotePatterns`
- `components/calming/header.tsx`, `footer.tsx` — `<img>` → `<Image>` с alt «БалтикЗемля»
- `components/calming/catalog-with-filters.tsx` — fallback alt-теги на изображениях

**SEO: IndexNow (Яндекс)**
- `lib/indexnow.ts` — хелпер для отправки URL
- `app/api/indexnow/route.ts` — POST API для ручной отправки
- `app/api/indexnow/key/route.ts` — ключ IndexNow
- `next.config.mjs` — rewrite `/{key}.txt` → API route
- `app/actions.ts` — IndexNow при `createPlot`, `updatePlot`, `updateNews`

**SEO: ISR и SEO-текст**
- `app/[district]/[settlement]/[slug]/page.tsx` — `revalidate = 3600`
- `app/news/[id]/page.tsx` — `revalidate = 3600`
- `app/catalog/[[...slug]]/page.tsx` — SEO-текст из `settlement_descriptions` внизу страницы

**Страница контактов** (`/contacts`)
- `app/contacts/page.tsx` — телефон, email, адрес, часы работы, соцсети из `organization_settings`
- `app/contacts/contacts-map-wrapper.tsx` — клиентская обёртка (dynamic import, SSR off)
- `components/map/contacts-map.tsx` — Leaflet карта с маркером офиса (ул. Брамса, 40)
- `components/calming/header.tsx` — ссылка «Контакты» → `/contacts`
- `app/sitemap.ts` — добавлены `/contacts`, `/about`

**Кастомная 404 страница**
- `app/not-found.tsx` — Header/Footer, навигация (каталог, ИЖС, FAQ, новости)

### 2026-02-09 — Создание .windsurfrules и PROGRESS.md
- Создан файл `.windsurfrules` с полными правилами проекта для AI-ассистента
- Создан файл `PROGRESS.md` для ведения истории изменений

### 2026-02-07 — Деплой всех изменений на прод + GitHub
- Деплой на VPS (`bash scripts/deploy.sh`) — успешно
- Пуш на GitHub (`git push origin main`) — коммит `eada95e`
- Favicon проверен — отдаётся корректно (HTTP 200), теги `<link rel="icon">` присутствуют в HTML

### 2026-02-06 — Плавная карта: адаптивный зум и анимации
**Файл**: `components/map/leaflet-catalog-map.tsx`

Улучшения карты Leaflet:
- **Адаптивный зум колёсиком** (`AdaptiveScrollZoom`) — медленная прокрутка = мелкий шаг (0.25), быстрая = крупный (до 1.5). Стандартный `scrollWheelZoom` отключён, кастомный обработчик `wheel` с аккумулятором скорости
- **CSS-транзиции** — тайлы (0.4s fade), маркеры (0.6s easing), полигоны (0.5s opacity), кластеры (0.6s scale animation)
- **Тайлы**: `updateWhenZooming: true`, `keepBuffer: 4` — загрузка во время зума, предзагрузка вокруг viewport
- **MarkerPaneFader** — плавный fade маркеров при переходе к полигонам (zoom 15→16), управление opacity через `markerPane`
- **Кластеры**: CSS keyframes `clusterFadeIn`, `spiderfyDistanceMultiplier: 1.5`, subtle spider legs
- **flyTo**: duration 1.2s, easeLinearity 0.25 (было 0.5s)
- **Полигоны**: плавная прозрачность по зуму (ramp 14→16), `baseFillOpacity` и `baseStrokeWeight` вычисляются динамически
- **ZoomTracker**: отслеживает и `zoom`, и `zoomend` для real-time обновлений
- `zoomSnap: 0.25`, `zoomDelta: 0.5`, `wheelPxPerZoomLevel: 250`

### 2026-02-06 — Кнопка "Как проехать" на карточках и детальной странице
**Файлы**: `components/calming/catalog-with-filters.tsx`, `components/plots/directions-button.tsx`, `app/[district]/[settlement]/[slug]/page.tsx`

- Создан компонент `DirectionsButton` — запрашивает геолокацию пользователя, строит маршрут от текущего местоположения до участка
- Навигаторы: Яндекс Навигатор, Google Maps, 2GIS (разные URL для мобильных и десктопа)
- 2GIS URL: `https://2gis.ru/directions/points/LON,LAT|LON,LAT`
- Модальное окно рендерится через `createPortal` в `document.body` — исправлен баг с дёрганием UI при наведении на соседние карточки
- Кнопка добавлена на карточки каталога и на детальную страницу участка (рядом с `CallbackButtons`)
- Текст кнопки: "Как проехать", выравнивание `ml-auto`

### 2026-02-06 — Статус земли на карточках каталога
**Файл**: `components/calming/catalog-with-filters.tsx`

- Бейдж статуса земли (ИЖС, Пром, СНТ и т.д.) перенесён с верхней части изображения карточки вниз, в секцию характеристик рядом с площадью

### 2026-02-01 — Интеграция Одноклассников и рефакторинг соцсетей
**Файлы**: `lib/ok-api.ts`, `app/api/admin/social/ok/`, `components/admin/dashboard/odnoklassniki-tab.tsx`, `components/admin/dashboard/publications-tab.tsx`

- Создан клиент OK API (`lib/ok-api.ts`) — публикация медиатопиков, загрузка фото, удаление топиков, расчёт подписи
- Унифицированы таблицы: `social_posts`, `social_settings`, `social_logs` для всех платформ
- Создан `PublicationsTab` с переключением между VK и OK
- Cron-задачи автопубликации: `app/api/cron/vk-auto-publish/route.ts`, `app/api/cron/ok-auto-publish/route.ts`
- API: settings, bulk-publish, sync, reset для обеих платформ
- Расширен `social/stats` API для статистики по обеим платформам

---

## Январь 2026

### Интеграция НСПД и интерактивная карта
**Файлы**: `lib/nspd-service/`, `components/map/leaflet-catalog-map.tsx`, `components/map/catalog-interactive-map.tsx`

- NSPD интеграция: автоматическое получение контуров участков и определение статуса земли по кадастровому номеру
- Интерактивная карта всех объектов с кластеризацией, полигонами, маркерами
- Zoom thresholds: 0-12 кластеры, 13-15 маркеры, 16+ полигоны
- Цветовая кодировка: зелёный (собственность), синий (аренда), оранжевый (бронь)
- Тултипы с информацией об участке при наведении
- Кадастровые подписи на полигонах

### Комплексные лоты (bundle)
- Поля `bundle_id`, `is_bundle_primary` в `land_plots`
- В каталоге показывается только primary, агрегируется площадь и кадастры
- На карте: общий контур по `bundle_polygon_color`, заливка по статусу каждого участка

### FAQ Management System
**Файлы**: `app/faq/page.tsx`, `components/admin/dashboard/faq-tab.tsx`

- CRUD FAQ из админки
- Публичная страница `/faq` с аккордеонами и формой обратной связи
- Интеграция с лидами — вопросы из FAQ попадают в базу заявок с типом `faq`

### Юридическая чистота
**Файлы**: `app/legal/page.tsx`, таблица `legal_content`

- Админка для управления контентом (тексты, изображения, PDF)
- Публичная страница `/legal`
- Бейдж в Hero-секции

### Рефакторинг импорта участков
**Файлы**: `components/admin/dashboard/import-tab.tsx`, `components/admin/land-plot-importer.tsx`

- Массовая загрузка нескольких файлов (.xlsx, .pdf, .json, .csv)
- Очередь импорта с прогресс-баром
- Автоматическое сопоставление адресов НСПД с КЛАДР
- Кнопка очистки участков по поселку

### SEO-роуты для участков
**Файлы**: `app/[district]/[settlement]/[slug]/page.tsx`, `app/catalog/[[...slug]]/page.tsx`

- ЧПУ-адреса для участков: `/район/поселок/slug`
- Каталог с фильтрами через URL-параметры
- Описания поселков из `settlement_descriptions`

### Популярные подборки в футере
**Файл**: `components/calming/footer.tsx`

- Ссылки на каталог с предустановленными фильтрами (ИЖС, рассрочка, недорогие и т.д.)

---

## Декабрь 2025

### Коммерческие предложения (КП)
**Файлы**: `app/admin/proposal-preview/`, `components/admin/dashboard/proposals/`

- Генерация PDF коммерческих предложений
- Предпросмотр с настраиваемыми шрифтами, цветами, блоками
- Настройки шаблона КП в `organization_settings`

### Рефакторинг импорта (вкладка «Импорт»)
- Отдельная вкладка в админке
- Обязательный выбор района + населённого пункта
- Шкала прогресса, логи импорта, очистка по поселку

---

## Декабрь 2024

### Рефакторинг админ-панели
**Файлы**: `components/admin/dashboard/*.tsx`

- Разбиение монолитного `admin-dashboard.tsx` (1973 строк) на логические компоненты
- Вынесены: `stats-overview`, `plots-tab`, `news-tab`, `leads-tab`, `subscribers-tab`, `users-tab`, `settings-tab`
- Добавлена `formatDate()` в `lib/utils.ts`
- `admin-dashboard.tsx` стал оркестратором

### Начальная версия проекта
- Next.js App Router + Supabase
- JWT-авторизация админки через `jose`
- Каталог участков с фильтрами
- Карточки участков, новости, заявки
- Telegram-бот с уведомлениями
- Импорт из Excel/PDF/CSV/JSON
- shadcn/ui компоненты (New York, Zinc)
- Docker-деплой на VPS

---

## Архитектурные решения

| Решение | Причина |
|---------|---------|
| JWT вместо Supabase Auth | Конфликт GoTrueClient при множественных экземплярах |
| Cookie в API route, не middleware | Next.js middleware не может надёжно устанавливать cookies |
| `createPortal` для модалок в карточках | Предотвращение дёрганья UI при hover на соседние карточки внутри `<Link>` |
| Адаптивный зум вместо стандартного | Стандартный `scrollWheelZoom` слишком резкий, нет контроля скорости |
| Единая БД dev/prod | Telegram 2FA работает только с публичным вебхуком |
| Service role key для админки | Обход RLS для административных операций |

---

## Март 2026

### 2026-03-06 — Универсальный конструктор КП во вкладке «Недвижимость»
**Файлы**: `components/admin/admin-sidebar.tsx`, `components/admin/admin-dashboard.tsx`, `components/admin/dashboard/proposals/universal-proposal-tool.tsx`, `components/admin/dashboard/proposals/proposal-preview-dialog.tsx`, `PROJECT_STRUCTURE.md`

- В меню админки (группа **НЕДВИЖИМОСТЬ**) добавлен отдельный пункт **«Коммерческие предложения»**.
- Реализован новый инструмент `UniversalProposalTool` для самостоятельного подбора участков и сборки КП без входящей заявки.
- Добавлены универсальные фильтры подбора:
  - район/населенный пункт;
  - поиск по тексту и кадастровому номеру;
  - бюджет (цена от/до);
  - площадь (от/до);
  - радиус от центра Калининграда (км, по координатам участка);
  - расстояние до моря (макс);
  - ВРИ/статус земли;
  - тип права (собственность/аренда);
  - коммуникации (газ, электричество, вода), рассрочка;
  - только активные / исключать бронь.
- Добавлен массовый выбор выдачи, ручной выбор карточек и формирование КП в предпросмотр + PDF.
- `ProposalPreviewDialog` расширен поддержкой имени/телефона клиента из нового инструмента (не только из заявки).
- Добавлена кнопка **«Сохранить как черновик КП в CRM»**:
  - из конструктора создаётся новая заявка (`leads`) с пометкой источника;
  - затем создаётся черновик КП (`commercial_proposals` + `commercial_proposal_plots`) с выбранными участками.
- Доработана логика выдачи в универсальном конструкторе:
  - добавлена кнопка **«Выбрать все участки»** (не только текущую отфильтрованную выдачу);
  - из списка исключены участки с ценой `0`;
  - для лотов в списке показывается только основной участок (primary/первый с ненулевой ценой);
  - в предпросмотре КП и PDF выводятся все кадастровые номера лота и пометка, что они продаются вместе.
- Добавлена отдельная кнопка **«Скачать PDF»** в универсальном конструкторе КП (прямая загрузка PDF без обязательного открытия окна предпросмотра).
- Исправлены ошибки на больших подборках (1000+ участков):
  - сохранение черновика КП переведено на батч-вставку `commercial_proposal_plots` (чанками по 200);
  - для скачивания PDF добавлен безопасный fallback-режим (текстовый многостраничный PDF без `html2canvas`) при очень большом количестве участков.
- Исправлена кодировка PDF (кириллица) на больших подборках:
  - заменён текстовый fallback `jsPDF` на image-based chunked fallback через `html2canvas`;
  - русский текст в PDF теперь сохраняется корректно даже для больших документов.
- Повышена стабильность скачивания PDF на средних/больших подборках:
  - уменьшен размер chunk при fallback-рендере (8 карточек на страницу);
  - снижена нагрузка рендера (`scale: 1.25` + retry на `scale: 1`, `useCORS: false`);
  - добавлена пауза между страницами для разгрузки браузера.
- Исправлено сохранение черновика КП в случаях проблем с Telegram:
  - сбой `sendMessageToAdmin` больше не прерывает `createLead`;
  - lead + draft КП продолжают сохраняться в CRM.
- Оптимизирована вкладка «Коммерческие предложения» при открытии:
  - результаты подбора и вычисление фильтрации теперь запускаются только после нажатия кнопки **«Показать»**;
  - при любом изменении фильтров выдача снова скрывается до повторного нажатия **«Показать»**;
  - снижена нагрузка на страницу и убраны тормоза при первом входе в раздел.
- Переработан экспорт PDF в «Коммерческих предложениях» для больших подборок:
  - PDF теперь формируется в едином режиме (без разделения на «малые/большие» сценарии);
  - убраны фотографии участков из PDF (уменьшен размер файла и устранены риски CORS/tainted canvas);
  - данные группируются по поселкам: одно описание поселка + общий список кадастровых номеров по нему;
  - добавлена разбивка длинных списков кадастров по секциям с пометкой продолжения.
- Синхронизирован формат предпросмотра КП с форматом PDF:
  - в `Открыть КП` убраны карточки отдельных участков и изображения;
  - предпросмотр теперь также группируется по поселкам (описание + список кадастровых номеров).
- Дополнительно усилена отказоустойчивость генерации PDF:
  - уменьшен размер секций для рендера кадастров;
  - рендер выполняется по 1 секции за итерацию;
  - ошибка отдельного чанка логируется и не валит весь цикл, при пустом результате возвращается контролируемая ошибка.
- Исправлена ошибка `Attempting to parse an unsupported color function "lab"` при скачивании PDF:
  - в `html2canvas` добавлен безопасный `onclone` для PDF-чанков;
  - из clone-документа удаляются глобальные `style/link`, из-за которых парсились `lab/oklch`;
  - для всех элементов PDF-чанка принудительно выставляются безопасные цвета/границы.
- Улучшена читаемость PDF с кадастровыми номерами:
  - кадастровые номера разложены в 3 стабильные колонки (через явный flex-layout, без наложений);
  - уменьшен размер блока кадастров на секцию (`30`), чтобы карточки не «ломали» страницу;
  - добавлены безопасные типографские параметры (`line-height`, `word-break`, `pre-wrap`) для описаний;
  - рендер чанка ограничен одной страницей с авто-масштабированием по высоте.
- Финальная шлифовка верстки PDF КП (по запросу на читаемость и плотную пагинацию):
  - для кадастров применен формат `кадастровый номер — цена` с `font-size: 11px` и увеличенным `line-height: 1.7`;
  - колоночная сетка стабилизирована на 2 колонки с явным разделением элементов по колонкам;
  - включена ручная «умная» пагинация по измеренной высоте секций (страницы заполняются плотнее, без крупных пустых зон);
  - сохранен безопасный `onclone` в `html2canvas` с очисткой глобальных стилей и принудительными безопасными цветами.
- Точечная правка читаемости строки `кадастр — цена` в PDF:
  - строка переведена из «сплошного текста» в grid-верстку из 2 ячеек (`номер` и `цена`) с фиксированным `column-gap: 14px`;
  - увеличены межстрочный интервал (`line-height: 1.85`) и расстояние между колонками (`gap: 20px`);
  - цена закреплена в отдельной правой ячейке, чтобы исключить визуальные наложения/«съедание» символов на стыке.
- Коррекция привязки `кадастр ↔ цена` в PDF/print:
  - убрано визуальное восприятие цены как «дальнего второго столбца»;
  - каждая строка кадастра теперь рендерится единым inline-блоком `номер — цена` с небольшим фиксированным `gap: 8px`;
  - сохранены текущие размеры шрифта и стилистика, без изменения бизнес-логики и источника данных.
- Хотфикс регрессии рендера PDF (пропадал текст кадастров/цен):
  - убран `inline-flex` внутри строки кадастров, который давал некорректный рендер в `html2canvas` на print/PDF;
  - строка переведена на более совместимый шаблон: обычный inline-текст + цена в соседнем `span` с `margin-left: 8px`;
  - восстановлена стабильная видимость строки формата `кадастр — цена` без разъезда в удалённую колонку.

### 2026-03-12 — SEO-ядро: Фаза 1 — новые коммерческие посадочные
**Файлы**: `config/seo-pages.ts`, `sim_iadro/SEO_PLAN.md`

- Проанализированы файлы SEO ТЗ: `baltland_clustering_brief.md`, `baltland_semantic_kernel.xlsx`, `baltland_seo_tz.xlsx`.
- Сопоставлены 56 фраз ядра (18 кластеров) с текущим `config/seo-pages.ts`.
- Выявлены 5 недостающих посадочных страниц и добавлены в `seo-pages.ts`:
  - `/catalog/gurevskiy-rayon` — Гурьевский район (гео-кластер, фильтр по району)
  - `/catalog/zelenogradskiy-rayon` — Зеленоградский район (гео-кластер, фильтр по району)
  - `/catalog/dlya-pmzh` — Для ПМЖ (фильтр ИЖС, seoText про критерии переезда)
  - `/catalog/s-gazom` — С газом (фильтр gas, SEO-оптимизированный Title)
  - `/catalog/s-elektrichestvom` — С электричеством (фильтр electricity, FAQ по подключению)
- Для каждой страницы написаны: Title, Description, H1, seoText с перелинковкой.
- Сохранён полный план реализации в `sim_iadro/SEO_PLAN.md`.

### 2026-03-12 — SEO-ядро: Фаза 2 — обновление мета-тегов
**Файлы**: `app/page.tsx`, `app/catalog/[[...slug]]/page.tsx`, `config/seo-pages.ts`

- Обновлены Title, Description и keywords главной страницы (`app/page.tsx`):
  - Title: «Купить участок в Калининградской области — ИЖС, у моря, с коммуникациями | БалтикЗемля»
  - Keywords расширены: добавлены «Гурьевский район», «у моря», «с коммуникациями», «в рассрочку», «ПМЖ»
- Обновлены Title и Description корневого каталога `/catalog`:
  - Title: «Каталог участков в Калининградской области — цены, районы, ИЖС | BaltLand»
  - H1: «Каталог земельных участков в Калининградской области»
- Обновлены Title и Description SEO-страниц в `config/seo-pages.ts`:
  - `/catalog/izhs` — «Купить участок ИЖС в Калининградской области — цены и предложения | БалтикЗемля»
  - `/catalog/sea` — «Купить участок у моря в Калининградской области | BaltLand»

### 2026-03-12 — SEO-ядро: Фаза 3 — информационные статьи блога
**Файлы**: `scripts/seed-blog-articles.ts`, таблица `news` (Supabase)

- Создан скрипт `scripts/seed-blog-articles.ts` для вставки SEO-статей в таблицу `news`.
- 3 статьи уже существовали в БД (ранее созданы вручную):
  - `/blog/oformlenie-uchastka` — Как оформить покупку земельного участка
  - `/blog/naznachenie-zemel` — ИЖС, ЛПХ, СНТ: различия ВРИ
  - `/blog/razreshenie-na-stroitelstvo` — Разрешение на строительство
- 2 новых статьи созданы скриптом:
  - `/blog/kategorii-zemel-kaliningradskoy-oblasti` — Категории земель (ИЖС, ЛПХ, сельхоз, СНТ)
  - `/blog/pereezd-v-kaliningrad-na-pmzh` — Переезд в Калининград на ПМЖ (гид с перелинковкой на гео-страницы)
- Все статьи содержат внутреннюю перелинковку на каталог и между собой.
- Статьи опубликованы (`is_published = true`).

### 2026-03-12 — SEO-ядро: Фаза 4 — внутренняя перелинковка
**Файлы**: `config/seo-pages.ts`

- Добавлены перекрёстные ссылки в seoText существующих SEO-страниц:
  - `/catalog/izhs` → ссылки на статьи блога (различия ВРИ, разрешение на строительство, оформление), на `/catalog/dlya-pmzh`
  - `/catalog/sea` → ссылки на `/catalog/zelenogradskiy-rayon`, гид по переезду на ПМЖ
  - `/catalog/kommunikacii` → ссылки на `/catalog/s-gazom`, `/catalog/s-elektrichestvom`, статью про строительство
  - `/catalog/gaz` → ссылки на `/catalog/s-elektrichestvom`, `/catalog/gurevskiy-rayon`, `/catalog/zelenogradskiy-rayon`
  - `/catalog/electricity` → ссылки на `/catalog/s-gazom`, гео-районы
  - `/catalog/do500`, `/catalog/do1m`, `/catalog/nedorogo` → ссылки на рассрочку, ПМЖ, статью оформления
  - `/catalog/rassrochka` → ссылки на статьи оформления и ВРИ
  - `/catalog/zelenogradsk` → ссылка на `/catalog/zelenogradskiy-rayon`, гид ПМЖ
  - `/catalog/svetlogorsk` → гид ПМЖ
  - `/catalog/kaliningrad` → хаб-ссылки на ИЖС/СНТ/ЛПХ, районы, статьи блога
  - `/catalog/vasilkovo`, `/catalog/isakovo` → ссылки на `/catalog/gurevskiy-rayon`

### 2026-03-12 — SEO-ядро: Фаза 5 — canonical для дублирующих slug
**Файлы**: `config/seo-pages.ts`, `app/catalog/[[...slug]]/page.tsx`

- Добавлено поле `canonicalSlug` в тип `SeoCatalogPageConfig`.
- `generateMetadata` в catalog page теперь использует `canonicalSlug` для формирования canonical URL.
- Настроены canonical для 3 дублирующих пар:
  - `/catalog/guryevsk` → canonical на `/catalog/gurevskiy-rayon`
  - `/catalog/gaz` → canonical на `/catalog/s-gazom`
  - `/catalog/electricity` → canonical на `/catalog/s-elektrichestvom`
- Это сообщает поисковым системам, что предпочтительный URL — новый SEO-оптимизированный slug.

### 2026-03-13 — MAX бот: фикс кнопки «Найти участки»
**Файлы**: `lib/max-bot/index.ts`

- Расширена нормализация webhook update для callback-событий MAX:
  - добавлен универсальный парсинг `callbackData` из разных полей (`payload`, `data`, `callback_data`, вложенные `body/payload`).
  - добавлен fallback на текст из callback-сообщения, если `callbackData` отсутствует.
- Улучшено извлечение `chatId`/`userId` и `text` для разных форматов входящего payload.
- Цель: устранить зацикливание, когда кнопка «Найти участки» не стартует сценарий поиска и бот отвечает сообщением про `/start`.

### 2026-03-13 — MAX бот: фикс выбора района
**Файлы**: `lib/max-bot/handlers/search.ts`

- Исправлен маппинг значений районов из клавиатуры бота к значениям в БД:
  - `Зеленоградский` → `Зеленоградский район`
  - `Гурьевский` → `Гурьевский район`
  - `Светлогорский` → `Светлогорский район`
  - `Балтийский` → `Балтийский район`
  - `Показать все` → `ALL`
- Ранее фильтр делал точное сравнение по `district`, и из-за несовпадения строк бот всегда возвращал «ничего не найдено» и снова показывал выбор районов.

### 2026-03-13 — MAX бот: шаг «посёлок» + навигация
**Файлы**: `lib/max-bot/state.ts`, `lib/max-bot/utils/keyboards.ts`, `lib/max-bot/utils/db-query.ts`, `lib/max-bot/handlers/search.ts`, `lib/max-bot/index.ts`

- После выбора района бот теперь показывает список посёлков в этом районе:
  - добавлен шаг сессии `settlement`;
  - добавлена клавиатура `settlementKeyboard(...)` с кнопкой `Показать все в районе`.
- В поиск добавлен фильтр по посёлку (`location`) и запрос списка посёлков по району (`getSettlementsByDistrict`).
- Добавлены кнопки навигации на каждом шаге:
  - `🏠 На главную` (`nav:home`);
  - `⬅️ Назад` (`nav:back`).
- Добавлена обработка `nav:home`/`nav:back` и переходов:
  - из результатов по району назад в список посёлков;
  - из шага посёлков назад к выбору районов;
  - из шага районов назад на главный экран.
- Сохранена текущая логика остальных кнопок выдачи (пагинация/карточка).

### 2026-03-13 — MAX бот: упрощён формат выдачи результатов
**Файлы**: `lib/max-bot/handlers/search.ts`, `lib/max-bot/utils/format-plot.ts`

- Удалён технический блок из выдачи:
  - `Для подробной карточки отправьте: /plot ...`
  - список UUID `Доступные номера в этой выдаче`.
- Каждый участок теперь отправляется отдельным сообщением только с SEO-ссылкой (`formatPlotUrl(...)`), чтобы превью-карточка формировалась по каждому лоту.
- Кнопки управления (`Следующие 5`, `На главную`, `Назад`) вынесены в отдельное итоговое сообщение `Выберите действие:`.

### 2026-03-13 — MAX бот: «Показать все» в районах показывает полный список районов
**Файлы**: `lib/max-bot/handlers/search.ts`, `lib/max-bot/utils/db-query.ts`, `lib/max-bot/utils/keyboards.ts`

- Кнопка `Показать все` на шаге выбора района больше не запускает немедленный показ участков.
- Добавлен отдельный шаг `openAllDistrictsStep(...)`, который загружает все активные районы из БД и показывает их клавиатурой.
- В `db-query` добавлен запрос `getAllDistricts()` (уникальные активные районы из `land_plots`).
- После выбора района из полного списка сценарий продолжает обычный поток: выбор посёлка → выдача ссылок на участки.

### 2026-03-13 — MAX бот: «Найти участки» сразу показывает полный список районов
**Файлы**: `lib/max-bot/handlers/start.ts`, `lib/max-bot/utils/keyboards.ts`

- В `startSearch(...)` шаг выбора района переведён на загрузку всех активных районов (`getAllDistricts`) и показ клавиатуры `allDistrictsKeyboard(...)`.
- Кнопка `Показать все` удалена из `districtKeyboard()`, чтобы пользователь сразу видел полный перечень районов после нажатия `Найти участки`.
- При временной недоступности списка районов оставлен fallback с сообщением об ошибке и базовой клавиатурой.

### 2026-03-04 — XML выгрузка участков для kupiprodai
**Файлы**: `scripts/generate-kupiprodai-xml.ts`, `kupiprodai-plots.xml`, `PROJECT_STRUCTURE.md`

- Добавлен скрипт `scripts/generate-kupiprodai-xml.ts` для сборки XML-фида по заданному списку кадастровых номеров.
- В XML фиксированы контактные данные: имя `Алексей`, телефон `+79316054484`.
- Остальные поля (title, description, price, area, location, district, coordinates, updated_at) подтягиваются из таблицы `land_plots`.
- Для изображения используется `land_plots.image_url`, при отсутствии — fallback на `land_plot_images.public_url` (cover/первое по сортировке).
- В корне проекта сформирован файл `kupiprodai-plots.xml` (формат `<rows><row>...</row></rows>` по примеру vip.kupiprodai.ru).
- При генерации обнаружено отсутствие в БД одного запрошенного кадастра: `39:03:090920:940` (в итоговый XML не попал).

### 2026-03-03 — MAX бот: старт Фазы 1 (MVP каркас)
**Файлы**: `package.json`, `package-lock.json`, `app/api/max-bot/webhook/route.ts`, `lib/max-bot/*`, `PROJECT_STRUCTURE.md`

- Добавлена зависимость `@maxhub/max-bot-api` для интеграции с MAX Bot API.
- Создан webhook endpoint `app/api/max-bot/webhook/route.ts` для приёма событий от MAX.
- Добавлен модуль `lib/max-bot/`:
  - `index.ts` — нормализация входящих update и маршрутизация команд `/start`, `/help`, `/search`.
  - `state.ts` — in-memory сессии пользователя (шаг, фильтры, страница результатов).
  - `handlers/start.ts` — приветствие и запуск сценария подбора.
  - `handlers/search.ts` — выбор района, поиск участков, пагинация, команда `/plot`.
  - `handlers/plot-detail.ts` — отправка детальной карточки участка.
  - `utils/db-query.ts` — запросы в `land_plots` через Supabase admin client.
  - `utils/format-plot.ts` — форматирование выдачи (карточка/детали) с SEO-ссылкой.
  - `utils/keyboards.ts` — кнопки сценария (старт, районы, пагинация).
  - `utils/max-api.ts` — отправка сообщений через `platform-api.max.ru` с заголовком `Authorization`.
- Обновлён `PROJECT_STRUCTURE.md`: добавлены `MAX_BOT_PLAN.md`, MAX webhook route и структура `lib/max-bot`.
- Добавлен admin API `app/api/admin/max/webhook/route.ts` для управления подпиской MAX webhook:
  - `GET` — получить текущие подписки (`/subscriptions`),
  - `POST` — установить webhook URL и `update_types`,
  - `DELETE` — удалить webhook.
  - Поддержан опциональный `MAX_WEBHOOK_SECRET` для заголовка `X-Max-Bot-Api-Secret`.

### 2026-03-03 — Анализ кластеризации карты + документация
**Файлы**: `MAP_CLUSTERING.md`, `PROJECT_STRUCTURE.md`

- Проведён разбор текущей реализации кластеризации карты.
- Зафиксировано, что рабочая кластеризация используется в `components/map/leaflet-catalog-map.tsx` через `react-leaflet-cluster`.
- Отдельно описана альтернативная реализация `components/map/dgis-map.tsx` (прямой `L.markerClusterGroup`) и её статус.
- Создан информационный файл `MAP_CLUSTERING.md` с:
  - архитектурой по уровням зума (кластеры → маркеры → полигоны),
  - параметрами `MarkerClusterGroup`,
  - описанием кастомных кластерных иконок,
  - оптимизациями производительности и чек-листом для изменений.
- `PROJECT_STRUCTURE.md` дополнен описанием нового файла документации.

### Исправление фильтра `/catalog/sea`
**Файлы**: `config/seo-pages.ts`, `components/calming/catalog-with-filters.tsx`

- Для SEO-страницы `sea` добавлен фильтр по округам: Зеленоградский, Светлогорский, Янтарный, Балтийский, Пионерский.
- В `SeoCatalogFilter` добавлено поле `districts?: string[]` для фильтрации по нескольким районам/округам.
- В `CatalogWithFilters` добавана поддержка `initialFilters.districts`:
  - нормализация токенов округов;
  - фильтрация карточек только по разрешённым округам для страниц с мульти-районным SEO-фильтром.

### Исправление фильтра `/catalog/rassrochka`
**Файл**: `config/seo-pages.ts`

- Для SEO-страницы `rassrochka` исправлено значение фильтра рассрочки: `installment: "Да"` → `installment: "yes"`.
- Это синхронизирует SEO-фильтр с логикой каталога, где рассрочка обрабатывается только по значениям `yes/no`.

### Исправление фильтра `/catalog/izhs-more`
**Файл**: `config/seo-pages.ts`

- Для SEO-страницы `izhs-more` заменён фильтр `maxDistanceToSea: 15` на фильтрацию по 5 целевым морским округам.
- Сохранён фильтр по ВРИ: `landStatus: "ИЖС"`.
- Целевые округа: Зеленоградский, Светлогорский, Янтарный, Балтийский, Пионерский.

### Исправление фильтра `/catalog/dacha-more`
**Файл**: `config/seo-pages.ts`

- Для SEO-страницы `dacha-more` заменён фильтр `maxDistanceToSea: 15` на фильтрацию по 5 целевым морским округам.
- Целевые округа: Зеленоградский, Светлогорский, Янтарный, Балтийский, Пионерский.

### Страница-хаб `/catalog/kaliningrad` (мини-каталог)
**Файлы**: `config/seo-pages.ts`, `app/catalog/[[...slug]]/page.tsx`, `components/calming/catalog-with-filters.tsx`

- Перенастроена SEO-страница `kaliningrad` в формат хаба (без жёсткого district-фильтра), чтобы выводить большой общий каталог.
- Для хаба включены стартовые параметры: `initialViewMode: "list"`, `initialItemsPerPage: 24`.
- В `CatalogWithFilters` добавана поддержка `initialItemsPerPage` и `initialViewMode` из SEO-конфига.
- Исправлена генерация URL пагинации: переходы между страницами теперь сохраняют текущий slug (`/catalog/kaliningrad?...`), а не сбрасываются на `/catalog?...`.
- В селекторе количества карточек добавлены значения `24` и `36` для выдачи «десятками».

### 2026-03-03 — MAX Bot: устойчивый запуск поиска по кнопке
**Файл**: `lib/max-bot/index.ts`

- Расширена нормализация входящего текста для старта поиска:
  - убираются эмодзи/пунктуация,
  - добавлена поддержка вариантов `найти участок`, `найти участки`, `поиск участков`,
  - добавлена поддержка payload-подобных текстов `search:start` / `search start`.
- Добавлен fail-safe матч `includes("найти участ")`, чтобы кнопка «Найти участки» запускала выбор района даже при вариациях текста от клиента MAX.

### 2026-03-19 — MAX Bot: исправлен неполный список районов
**Файл**: `lib/max-bot/utils/db-query.ts`

- Увеличен `.limit()` с `200` до `10000` в `getAllDistricts()` и `getSettlementsByDistrict()`.
- Причина: при `.limit(200)` + `.order("district")` возвращались только первые 200 строк по алфавиту — если в первых двух районах (Багратионовский, Гвардейский) суммарно ≥200 участков, остальные районы не попадали в выборку.
- Результат: бот теперь показывает полный список всех районов с активными участками.

### 2026-03-19 — MAX Bot: добавлены постоянные кнопки связи в клавиатурах
**Файл**: `lib/max-bot/utils/keyboards.ts`

- В общий навигационный блок добавлены кнопки:
  - `📞 Позвонить нам` → `tel:+79316054484`
  - `💬 Написать в MAX` → `https://max.ru/u/f9LHodD0cOKKHLu5hURpYX8eA2FEGHRrVGVpkLRxcsoNxnrzK4kUb-tupvg`
- Навигация переведена на `navigationRows()` (2 ряда), чтобы кнопки связи отображались вместе с `🏠 На главную` и `⬅️ Назад` на всех экранах бота.

### 2026-03-19 — MAX Bot: хотфикс `/start` после добавления кнопки звонка
**Файлы**: `lib/max-bot/utils/keyboards.ts`, `lib/max-bot/index.ts`

- Кнопка `📞 Позвонить нам` переведена с `url: tel:+79316054484` на `callback_data: "contact:call"`.
- Добавлен обработчик `contact:call` в роутере апдейтов бота: при нажатии отправляется сообщение с номером `+7 931 605-44-84`.
- Причина: `tel:`-ссылка в inline-кнопке могла ломать отправку клавиатуры в MAX, из-за чего команда `/start` переставала отвечать.

### 2026-03-19 — Каталог: исправлен сценарий `/catalog?isNew=true`
**Файл**: `app/catalog/[[...slug]]/page.tsx`

- Убрано применение query-параметра `isNew` при формировании `initialFilters`.
- Причина: `isNew=true` включал фильтр «только за 30 дней» в клиентском каталоге, и при отсутствии новых участков страница показывала `0 участков`.
- Результат: при переходе на `/catalog?isNew=true` теперь отображается полный список участков (без скрытого предфильтра «новые»).

---

**Последнее обновление**: 24 апреля 2026
