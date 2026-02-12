# PROGRESS.md — История изменений проекта Baltland.ru

> Этот файл ведётся постоянно. После каждого значимого изменения добавляется запись.

---

## Февраль 2026

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

**Последнее обновление**: 9 февраля 2026
