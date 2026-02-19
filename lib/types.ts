export interface LandPlot {
  id: string
  int_id?: number
  title: string
  description: string | null
  price: number
  area_sotok: number
  district: string
  region?: string | null
  location: string | null
  distance_to_sea?: number | null
  land_status: string
  has_gas: boolean
  has_electricity: boolean
  has_water: boolean
  has_installment: boolean
  ownership_type?: "ownership" | "lease" | string | null
  lease_from?: string | null
  lease_to?: string | null
  vri_id?: string | null
  image_url: string | null
  youtube_video_url?: string | null
  rutube_video_url?: string | null
  images?: LandPlotImage[]
  is_featured: boolean
  is_reserved?: boolean
  bundle_id?: string | null
  bundle_title?: string | null
  is_bundle_primary?: boolean
  is_active: boolean
  status?: "active" | "archived" | string
  cadastral_number: string | null
  additional_cadastral_numbers?: string[] | null
  additional_coordinates?: Array<{
    cadastral_number: string
    center_lat?: number | null
    center_lon?: number | null
    coordinates_json?: any
    area_sotok?: number
  }> | null
  coordinates_json?: any | null
  has_coordinates?: boolean
  center_lat?: number | null
  center_lon?: number | null
  sync_error?: string | null
  vk_post?: {
    url: string | null
    published_at: string | null
  } | null
  created_at: string
  updated_at: string
}

export interface LandPlotData {
  title: string
  description?: string
  price: number
  area_sotok: number
  district: string
  location: string
  land_status?: string
  cadastral_number: string
  ownership_type?: "ownership" | "lease" | string
  lease_from?: string
  lease_to?: string
  vri_id?: string
  is_reserved?: boolean
  bundle_id?: string
  bundle_title?: string
  is_bundle_primary?: boolean
  coordinates_json?: any
  has_coordinates?: boolean
  center_lat?: number
  center_lon?: number
  sync_error?: string | null
  has_gas?: boolean
  has_electricity?: boolean
  has_water?: boolean
  has_installment?: boolean
}

export type ImportOperation = "added" | "updated" | "archived" | "error" | "skipped"

export interface SyncDetail {
  line: number
  status: ImportOperation
  message: string
  cadastral: string
}

export interface SyncResult {
  success: boolean
  message: string
  added: number
  updated: number
  deleted: number
  errors: string[]
  details: SyncDetail[]
}

export interface LandPlotImage {
  id: string
  plot_id: string
  storage_path: string
  public_url: string
  is_cover: boolean
  sort_order?: number | null
  created_at: string
}

export interface PlotPlaceholder {
  id: string
  storage_path: string
  public_url: string
  created_at: string
}

export interface FilterParams {
  district?: string
  minArea?: number
  maxArea?: number
  minPrice?: number
  maxPrice?: number
  landStatus?: string
  hasGas?: boolean
  hasElectricity?: boolean
  maxDistanceToSea?: number
  hasInstallment?: boolean
}

// All districts of Kaliningrad Oblast
export const KALININGRAD_DISTRICTS = [
  { value: "all", label: "Все районы" },
  { value: "Багратионовский район", label: "Багратионовский район" },
  { value: "Балтийский городской округ", label: "Балтийский городской округ" },
  { value: "Гвардейский район", label: "Гвардейский район" },
  { value: "Гурьевский городской округ", label: "Гурьевский городской округ" },
  { value: "Гусевский городской округ", label: "Гусевский городской округ" },
  { value: "Зеленоградский район", label: "Зеленоградский район" },
  { value: "Калининград", label: "г. Калининград" },
  { value: "Краснознаменский городской округ", label: "Краснознаменский городской округ" },
  { value: "Ладушкинский городской округ", label: "Ладушкинский городской округ" },
  { value: "Мамоновский городской округ", label: "Мамоновский городской округ" },
  { value: "Неманский городской округ", label: "Неманский городской округ" },
  { value: "Нестеровский район", label: "Нестеровский район" },
  { value: "Озерский городской округ", label: "Озерский городской округ" },
  { value: "Пионерский городской округ", label: "Пионерский городской округ" },
  { value: "Полесский район", label: "Полесский район" },
  { value: "Правдинский район", label: "Правдинский район" },
  { value: "Светловский городской округ", label: "Светловский городской округ" },
  { value: "Светлогорский городской округ", label: "Светлогорский городской округ" },
  { value: "Славский район", label: "Славский район" },
  { value: "Советский городской округ", label: "Советский городской округ" },
  { value: "Черняховский городской округ", label: "Черняховский городской округ" },
  { value: "Янтарный городской округ", label: "Янтарный городской округ" },
] as const

export const AREA_OPTIONS = [
  { value: "all", label: "Любая" },
  { value: "4-6", label: "4-6 соток", min: 4, max: 6 },
  { value: "6-8", label: "6-8 соток", min: 6, max: 8 },
  { value: "8-10", label: "8-10 соток", min: 8, max: 10 },
  { value: "10-15", label: "10-15 соток", min: 10, max: 15 },
  { value: "15-25", label: "15-25 соток", min: 15, max: 25 },
  { value: "25+", label: "25+ соток", min: 25, max: 1000 },
] as const

export const LAND_STATUS_OPTIONS = [
  { value: "all", label: "Любой" },
  { value: "ИЖС", label: "ИЖС" },
  { value: "СНТ", label: "СНТ" },
  { value: "ЛПХ", label: "ЛПХ" },
  { value: "СХ", label: "СХ" },
  { value: "ПРОМ", label: "ПРОМ" },
] as const

export interface Subscriber {
  id: string
  email: string
  is_active: boolean
  created_at: string
}

export interface Lead {
  id: string
  name: string
  phone: string
  wishes: string | null
  lead_type?: "general" | "viewing" | "faq" | null
  plot_id?: string | null
  plot_location?: string | null
  plot_cadastral_number?: string | null
  plot_price?: number | null
  plot_area_sotok?: number | null
  messenger_whatsapp?: boolean | null
  messenger_telegram?: boolean | null
  status: "new" | "in_progress" | "thinking" | "sold" | "rejected"
  manager_comment: string | null
  assigned_to?: string | null
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  username?: string
  email: string
  password_hash?: string
  name: string
  role: "admin" | "manager"
  is_active: boolean
  created_at: string
  updated_at: string
}

export const LEAD_STATUS_OPTIONS = [
  { value: "new", label: "Новая", color: "bg-blue-100 text-blue-700" },
  { value: "in_progress", label: "В работе", color: "bg-yellow-100 text-yellow-700" },
  { value: "thinking", label: "Думает", color: "bg-purple-100 text-purple-700" },
  { value: "sold", label: "Купил", color: "bg-green-100 text-green-700" },
  { value: "rejected", label: "Отказ", color: "bg-red-100 text-red-700" },
] as const

export const USER_ROLE_OPTIONS = [
  { value: "admin", label: "Администратор" },
  { value: "manager", label: "Менеджер" },
] as const

export interface News {
  id: string
  slug: string | null
  title: string
  meta_title: string | null
  meta_description: string | null
  content: string
  image_url: string | null
  is_published: boolean
  author?: string | null
  sort_order: number
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface CommercialProposal {
  id: string
  lead_id: string
  title: string
  description: string | null
  status: "draft" | "sent" | "viewed" | "accepted" | "rejected"
  created_by: string | null
  created_at: string
  updated_at: string
  sent_at: string | null
}

export interface CommercialProposalPlot {
  id: string
  proposal_id: string
  plot_id: string
  sort_order: number
  custom_note: string | null
  created_at: string
}

export interface CommercialProposalWithDetails extends CommercialProposal {
  lead?: Lead
  commercial_proposal_plots?: (CommercialProposalPlot & { plot: LandPlot })[]
}

export interface NspdSettings {
  proxy?: string | null  // deprecated, kept for backward compatibility
  proxy_auth?: string | null  // format: login:password@host:port
  proxy_simple?: string | null  // format: ip:port
  timeout_ms?: number | null
  coords_order?: "lat,lon" | "lon,lat" | null
}

export const PROPOSAL_STATUS_OPTIONS = [
  { value: "draft", label: "Черновик", color: "bg-gray-100 text-gray-700" },
  { value: "sent", label: "Отправлено", color: "bg-blue-100 text-blue-700" },
  { value: "viewed", label: "Просмотрено", color: "bg-purple-100 text-purple-700" },
  { value: "accepted", label: "Принято", color: "bg-green-100 text-green-700" },
  { value: "rejected", label: "Отклонено", color: "bg-red-100 text-red-700" },
] as const

export type TelegramBotEventType = 'leads' | 'viewing' | 'callback' | 'errors' | 'faq' | 'auth'

export interface TelegramBotConfig {
  id: string
  name: string
  token: string
  chat_id?: string  // Optional per-bot chat ID, falls back to global adminChatId
  enabled_events: TelegramBotEventType[]
}

export interface OrganizationSettings {
  id: string
  organization_name: string
  phone: string
  email: string
  address: string
  logo_url: string | null
  favicon_url?: string | null
  home_promo_1_image_url?: string | null
  home_promo_1_href?: string | null
  home_promo_2_image_url?: string | null
  home_promo_2_href?: string | null
  home_block_progressive_disclosure?: unknown | null
  home_block_roi_calculator?: unknown | null
  home_block_faq?: unknown | null
  working_hours: string
  show_cadastral_number: boolean
  show_price: boolean
  show_area: boolean
  show_district: boolean
  show_location: boolean
  show_status: boolean
  show_distance_to_sea: boolean
  show_amenities: boolean
  show_image: boolean
  show_social_media: boolean
  show_vk: boolean
  vk_url: string | null
  show_telegram: boolean
  telegram_url: string | null
  show_whatsapp: boolean
  whatsapp_url: string | null
  show_youtube: boolean
  youtube_url: string | null
  show_instagram: boolean
  instagram_url: string | null
  // Telegram Bot настройки
  telegram_bot_token: string | null
  telegram_leads_bot_token?: string | null
  telegram_admin_chat_id: string | null
  telegram_webhook_url: string | null
  telegram_bots?: TelegramBotConfig[] | null
  // Шаблоны сообщений Telegram (поддерживают переменные {name}, {phone}, {cadastral} и т.д.)
  telegram_template_new_lead: string | null
  telegram_template_viewing: string | null
  telegram_template_error: string | null
  // Proposal template customization
  proposal_blocks_order: string[] | null
  proposal_primary_color: string | null
  proposal_accent_color: string | null
  proposal_header_bg_color: string | null
  proposal_font_family: string | null
  proposal_custom_font_url: string | null
  proposal_header_font_size: number | null
  proposal_body_font_size: number | null
  proposal_logo_size: "small" | "medium" | "large" | null
  proposal_show_logo: boolean
  proposal_show_org_name: boolean
  proposal_contacts_position: "right" | "below-logo" | "footer-only" | null
  proposal_header_show_phone: boolean
  proposal_header_show_email: boolean
  proposal_header_show_address: boolean
  proposal_footer_text: string | null
  proposal_show_footer: boolean
  chat_widget_enabled: boolean
  chat_welcome_message: string | null
  chat_prompt_placeholder: string | null
  chat_consultant_name: string | null
  chat_consultant_avatar_url: string | null
  chat_quick_questions: string[] | null
  chat_telegram_bot_id: string | null
  two_factor_auth_enabled: boolean
  map_settings: MapSettings | null
  nspd_settings?: NspdSettings | null
  // Plot description disclaimer (shown at the bottom of every plot description)
  plot_description_disclaimer?: string | null
  // About Company content
  about_company_title: string | null
  about_company_subtitle: string | null
  about_company_content: string | null
  about_company_stats: any | null // JSON
  about_company_advantages: any | null // JSON
  created_at: string
  updated_at: string
}

export interface MapSettings {
  initial_center_lat?: number
  initial_center_lon?: number
  initial_zoom?: number
  cluster_zoom_threshold?: number
  detail_zoom_threshold?: number
  polygon_color?: string
  polygon_fill_color?: string
  polygon_fill_opacity?: number
  polygon_weight?: number
  ownership_polygon_color?: string
  lease_polygon_color?: string
  reserved_polygon_color?: string
  bundle_polygon_color?: string
  selected_polygon_color?: string
  selected_polygon_fill_color?: string
  selected_polygon_fill_opacity?: number
  selected_polygon_weight?: number
  marker_color?: string
  cluster_marker_color?: string
  show_tooltip?: boolean
  tooltip_show_title?: boolean
  tooltip_show_cadastral?: boolean
  tooltip_show_price?: boolean
  tooltip_show_area?: boolean
  tooltip_show_land_status?: boolean
  tooltip_show_location?: boolean
  show_marker_labels?: boolean

  // Yandex map controls/layers toggles
  yandex_show_type_selector?: boolean
  yandex_show_traffic?: boolean
  yandex_show_geolocation?: boolean
  yandex_show_zoom_control?: boolean
  yandex_show_fullscreen_control?: boolean
}


export type LandingBenefitIconType = "lucide" | "image"

export interface LandingBenefitsSection {
  id: string
  title: string
  subtitle: string

  left_image_url: string | null
  left_title: string
  left_description: string
  left_button_text: string
  left_button_url: string

  right_image_url: string | null
  right_title: string
  right_description: string
  right_button_text: string
  right_button_url: string

  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LandingBenefitItem {
  id: string
  section_id: string
  title: string
  description: string
  icon_type: LandingBenefitIconType
  icon_name: string | null
  icon_url: string | null
  color_class: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// Address data types
export interface District {
  id: string
  name: string
  name_short: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Settlement {
  id: string
  district_id: string
  name: string
  settlement_type: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  districts?: {
    name: string
  }
}

export interface SettlementDescription {
  id: string
  district_name: string
  settlement_name: string
  description: string
  disclaimer?: string | null
  has_gas?: boolean
  has_electricity?: boolean
  has_water?: boolean
  has_installment?: boolean
  is_featured?: boolean
  created_at: string
  updated_at: string
}

export interface Street {
  id: string
  settlement_id: string
  name: string
  street_type: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  settlements?: {
    name: string
  }
}

export interface FaqItem {
  id: string
  question: string
  answer: string
  category: string
  icon?: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export const FAQ_CATEGORIES = [
  { value: "utilities", label: "Коммуникации", icon: "Zap" },
  { value: "documents", label: "Документы", icon: "FileText" },
  { value: "payment", label: "Оплата", icon: "CreditCard" },
  { value: "roads", label: "Дороги и инфраструктура", icon: "MapPin" },
  { value: "general", label: "Общие вопросы", icon: "HelpCircle" },
] as const

export interface LegalContent {
  id: string
  title: string
  content: string
  image_url: string | null
  pdf_url: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}
