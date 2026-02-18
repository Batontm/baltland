"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Plus,
  TreePine,
  LayoutDashboard,
  LogIn,
  X,
  ArrowLeft,
  Users,
  MessageSquare,
  TrendingUp,
  DollarSign,
  Bell,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Phone,
  Mail,
  Calendar,
  Shield,
  ShieldCheck,
  Edit2,
  Newspaper,
  Download,
  LogOut,
  CheckCircle,
  Search,
  MapPin,
  RefreshCw,
} from "lucide-react"
import {
  type LandPlot,
  type Lead,
  type Subscriber,
  type User,
  type News,
  type CommercialProposalWithDetails,
  type OrganizationSettings,
  type District,
  type Settlement,
  LEAD_STATUS_OPTIONS,
  KALININGRAD_DISTRICTS,
  LAND_STATUS_OPTIONS,
  USER_ROLE_OPTIONS,
  type SyncResult,
  type FaqItem,
  type LegalContent,
} from "@/lib/types"

import {
  createPlot,
  updatePlot,
  deletePlot,
  updateLead,
  deleteLead,
  deleteSubscriber,
  createUser,
  updateUser,
  deleteUser,
  getUsers,
  getLandPlots,
  createProposal,
  getProposalsByLead,
  getSubscribers,
  updateSubscriber,
  getAdminStats,
  createNews as createNewsAction,
  updateNews as updateNewsAction,
  deleteNews as deleteNewsAction,
  getProposalById,
  getAllProposalsForLeads,
  getOrganizationSettings,
  updateOrganizationSettings,
  getDistricts,
  getSettlementsByDistrictName,
  getFaqItems,
  createFaqItem,
  updateFaqItem,
  deleteFaqItem,
  reorderFaqItems,
  getLegalContent,
  createLegalContent,
  updateLegalContent,
  deleteLegalContent,
  reorderLegalContent,
} from "@/app/actions"

import { KALININGRAD_SETTLEMENTS } from "@/lib/kaliningrad-settlements" // Added import
import { formatDate } from "@/lib/utils"
import { StatsOverview } from "@/components/admin/dashboard/stats-overview"
import { NewsTab } from "@/components/admin/dashboard/news-tab"
import { LeadsTab } from "@/components/admin/dashboard/leads-tab"
import { SubscribersTab } from "@/components/admin/dashboard/subscribers-tab"
import { UsersTab } from "@/components/admin/dashboard/users-tab"
import { PlotsTab, type PlotStatusFilter } from "@/components/admin/dashboard/plots-tab"
import { SettingsTab } from "@/components/admin/dashboard/settings-tab"
import { HomePromoCard } from "@/components/admin/dashboard/settings/home-promo-card"
import { TelegramTab } from "@/components/admin/dashboard/telegram-tab"
import { ImportTab } from "@/components/admin/dashboard/import-tab"
import { SettlementDescriptionsTab } from "@/components/admin/dashboard/settlement-descriptions-tab"
import { DuplicateAddressesTab } from "@/components/admin/dashboard/duplicate-addresses-tab"
import { MapTab } from "@/components/admin/dashboard/map-tab"
import { FaqTab } from "@/components/admin/dashboard/faq-tab"
import { LegalTab } from "@/components/admin/dashboard/legal-tab"
import { NspdTab } from "@/components/admin/dashboard/nspd-tab"

import { CreateProposalDialog } from "@/components/admin/dashboard/proposals/create-proposal-dialog"
import { ProposalPreviewDialog } from "@/components/admin/dashboard/proposals/proposal-preview-dialog"
import ProposalPDFView from "@/components/admin/proposal-pdf-view"
import { AdminLayout } from "@/components/admin/admin-layout"
import { type AdminSection } from "@/components/admin/admin-sidebar"
import { ContactInfoCard } from "@/components/admin/dashboard/settings/contact-info-card"
import { SocialMediaCard } from "@/components/admin/dashboard/settings/social-media-card"
import { PlaceholdersCard } from "@/components/admin/dashboard/settings/placeholders-card"
import { ProposalTemplateEditor } from "@/components/admin/dashboard/settings/proposal-template-editor"
import { HomeNewBlockCard } from "@/components/admin/dashboard/settings/home-new-block-card"
import { TelegramSettingsCard } from "@/components/admin/dashboard/settings/telegram-settings-card"
import { TelegramTemplatesCard } from "@/components/admin/dashboard/settings/telegram-templates-card"
import { ChatSettingsCard } from "@/components/admin/dashboard/settings/chat-settings-card"
import { PublicationsTab } from "@/components/admin/dashboard/publications-tab"
import type { PlotPlaceholder } from "@/lib/types"

interface AdminDashboardProps {
  initialPlots: LandPlot[]
  initialLeads: Lead[]
  initialSubscribers: Subscriber[]
  initialUsers: User[]
  initialNews: News[]
  initialFaqItems: FaqItem[]
  initialLegalContent: LegalContent[]

  initialStats: {
    // Renamed from stats to initialStats
    totalPlots: number
    activePlots: number
    featuredPlots: number
    totalArea: number
    newLeadsToday: number
    newLeadsWeek: number
    totalLeads: number
    totalSubscribers: number
    avgPricePerSotka: number
    totalValue: number
  }
  isAuthenticated: boolean
}

export function AdminDashboard({
  initialPlots,
  initialLeads,
  initialSubscribers,
  initialUsers,
  initialNews,
  initialFaqItems,
  initialLegalContent,
  initialStats, // Renamed from stats to initialStats

  isAuthenticated,
}: AdminDashboardProps) {
  console.log("[v0] AdminDashboard: Component mounting", {
    plotsCount: initialPlots.length,
    leadsCount: initialLeads.length,
    subscribersCount: initialSubscribers.length,
    usersCount: initialUsers.length,
    newsCount: initialNews.length,
    faqCount: initialFaqItems.length,
    isAuthenticated,
  })

  const router = useRouter()
  const [plots, setPlots] = useState<LandPlot[]>(initialPlots)
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [subscribers, setSubscribers] = useState<Subscriber[]>(initialSubscribers)
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [news, setNews] = useState<News[]>(initialNews)
  const [faqItems, setFaqItems] = useState<FaqItem[]>(initialFaqItems)
  const [legalContent, setLegalContent] = useState<LegalContent[]>(initialLegalContent)
  const [stats, setStats] = useState(initialStats) // Add stats state

  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard")
  const [orgSettings, setOrgSettings] = useState<OrganizationSettings | null>(null)
  const [loadingSettings, setLoadingSettings] = useState(false)

  // Settings cards states
  const [placeholders, setPlaceholders] = useState<PlotPlaceholder[]>([])
  const [loadingPlaceholders, setLoadingPlaceholders] = useState(false)
  const [uploadingPlaceholder, setUploadingPlaceholder] = useState(false)

  // Plot editing state
  const [editingPlot, setEditingPlot] = useState<LandPlot | null>(null)
  const [isCreatingPlot, setIsCreatingPlot] = useState(false)
  const [loading, setLoading] = useState(false)

  // Plot search and filter states
  const [plotSearch, setPlotSearch] = useState("") // Added
  const [plotStatusFilter, setPlotStatusFilter] = useState<PlotStatusFilter>("all") // Added
  const [plotDistrictFilter, setPlotDistrictFilter] = useState("all") // Added
  const [plotSettlementFilter, setPlotSettlementFilter] = useState("all") // Added
  const [plotNoGeoFilter, setPlotNoGeoFilter] = useState(false)

  // Lead editing state
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showProposalDialog, setShowProposalDialog] = useState(false)
  const [selectedPlots, setSelectedPlots] = useState<string[]>([])
  const [availablePlots, setAvailablePlots] = useState<LandPlot[]>([])
  const [proposalTitle, setProposalTitle] = useState("")
  const [proposalDescription, setProposalDescription] = useState("")
  const [districtFilter, setDistrictFilter] = useState("all") // This is for proposal dialog, not plot list
  const [settlementFilter, setSettlementFilter] = useState("") // New state for settlement filter
  const [cadastralFilter, setCadastralFilter] = useState("") // New state for cadastral number filter
  const [leadProposals, setLeadProposals] = useState<Record<string, CommercialProposalWithDetails[]>>({})

  // Address data from database
  const [districts, setDistricts] = useState<District[]>([])
  const [proposalSettlements, setProposalSettlements] = useState<Settlement[]>([])
  const [plotSettlements, setPlotSettlements] = useState<Settlement[]>([])
  const [loadingAddresses, setLoadingAddresses] = useState(false)

  // User editing state
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isCreatingUser, setIsCreatingUser] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // News editing state
  const [editingNews, setEditingNews] = useState<News | null>(null)
  const [isCreatingNews, setIsCreatingNews] = useState(false)

  // FAQ editing state
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null)
  const [isCreatingFaq, setIsCreatingFaq] = useState(false)

  const [showProposalPreview, setShowProposalPreview] = useState(false)
  const [selectedProposal, setSelectedProposal] = useState<CommercialProposalWithDetails | null>(null)
  const [isDownloadingProposalPDF, setIsDownloadingProposalPDF] = useState(false)
  const pdfCaptureRef = useRef<HTMLDivElement | null>(null)
  const [pdfRenderSettings, setPdfRenderSettings] = useState<OrganizationSettings | null>(null)

  // Automatic refresh polling
  useEffect(() => {
    const interval = setInterval(() => {
      console.log("[AdminDashboard] Auto-refreshing data...")
      handleRefresh()
    }, 2 * 60 * 1000) // Every 2 minutes

    return () => clearInterval(interval)
  }, [])

  const emptyPlot: Partial<LandPlot> = {
    title: "",
    description: "",
    price: 0,
    area_sotok: 0,
    district: "",
    location: "",
    land_status: "ИЖС",
    has_gas: false,
    has_electricity: false,
    has_water: false,
    has_installment: false,
    image_url: "",
    youtube_video_url: "",
    rutube_video_url: "",
    is_featured: false,
    is_active: true,
    cadastral_number: "",
    status: "active", // Added default status for new plots
    bundle_id: null,
    is_bundle_primary: false,
  }

  const [plotFormData, setPlotFormData] = useState<Partial<LandPlot>>(emptyPlot)
  const [isBundleMode, setIsBundleMode] = useState<boolean>(false)
  const [bundleRows, setBundleRows] = useState<Array<{ cadastral_number: string; area_sotok: string; ownership_type: string }>>([
    { cadastral_number: "", area_sotok: "", ownership_type: "ownership" },
  ])
  // Initialize leadFormData with default values that can be overwritten
  const [leadFormData, setLeadFormData] = useState<Partial<Lead>>({
    wishes: "",
    status: "new",
    manager_comment: "",
    assigned_to: "",
  })
  const [userFormData, setUserFormData] = useState<{
    username: string
    email: string
    password: string
    name: string
    role: "admin" | "manager"
  }>({
    username: "",
    email: "",
    password: "",
    name: "",
    role: "manager",
  })
  // Initialize newsFormData with default values
  const [newsFormData, setNewsFormData] = useState<Partial<News>>({
    title: "",
    content: "",
    author: "",
    image_url: "",
    is_published: false,
  })

  const [faqFormData, setFaqFormData] = useState<Partial<FaqItem>>({
    question: "",
    answer: "",
    category: "general",
    is_active: true,
  })

  const formatPrice = (price: number) => new Intl.NumberFormat("ru-RU").format(price) + " ₽"

  // ============ PLOT HANDLERS ============
  const handleCreatePlot = () => {
    setPlotFormData(emptyPlot)
    setIsBundleMode(false)
    setBundleRows([{ cadastral_number: "", area_sotok: "", ownership_type: "ownership" }])
    setIsCreatingPlot(true)
    setEditingPlot(null)
  }

  const handleEditPlot = async (plot: LandPlot) => {
    setPlotFormData(plot)
    setEditingPlot(plot)
    setIsCreatingPlot(false)

    // Load settlements for this plot's district so the combobox can show the value
    if (plot.district) {
      setLoadingAddresses(true)
      try {
        const settlementsData = await getSettlementsByDistrictName(plot.district)
        setPlotSettlements(settlementsData)
      } catch (error) {
        console.error("Error loading settlements for edit:", error)
      } finally {
        setLoadingAddresses(false)
      }
    } else {
      setPlotSettlements([])
    }

    // Populate bundle rows if this is a bundle
    if (plot.bundle_id) {
      const bundleMembers = plots.filter((p) => p.bundle_id === plot.bundle_id)
      setBundleRows(
        bundleMembers.map((p) => ({
          cadastral_number: String(p.cadastral_number || ""),
          area_sotok: String(p.area_sotok ?? ""),
          ownership_type: String(p.ownership_type || "ownership"),
        }))
      )
      setIsBundleMode(true)
    } else {
      setBundleRows([{ cadastral_number: "", area_sotok: "", ownership_type: "ownership" }])
      setIsBundleMode(false)
    }
  }

  const handleCancelPlot = () => {
    setPlotFormData(emptyPlot)
    setIsBundleMode(false)
    setBundleRows([{ cadastral_number: "", area_sotok: "", ownership_type: "ownership" }])
    setIsCreatingPlot(false)
    setEditingPlot(null)
  }

  const handleSavePlot = async () => {
    setLoading(true)
    try {
      if (isCreatingPlot) {
        const items = isBundleMode
          ? bundleRows
            .map((r) => ({
              cadastral_number: String(r.cadastral_number || "").trim(),
              area_sotok: String(r.area_sotok || "").trim(),
              ownership_type: r.ownership_type || "ownership",
            }))
            .filter((r) => !!r.cadastral_number)
          : []

        if (isBundleMode && items.length > 1) {
          const bundleId = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`

          const primaryItem = items[0]
          const primaryArea = primaryItem.area_sotok ? Number(primaryItem.area_sotok) : null

          const primaryPlot = await createPlot({
            ...plotFormData,
            cadastral_number: primaryItem.cadastral_number,
            area_sotok: Number.isFinite(primaryArea)
              ? (primaryArea as number)
              : (typeof plotFormData.area_sotok === "number" ? plotFormData.area_sotok : 0),
            ownership_type: primaryItem.ownership_type,
            bundle_id: bundleId,
            is_bundle_primary: true,
          })

          const created: LandPlot[] = []
          if (primaryPlot) created.push(primaryPlot)

          for (const item of items.slice(1)) {
            const memberArea = item.area_sotok ? Number(item.area_sotok) : null

            const member = await createPlot({
              ...plotFormData,
              title: plotFormData.title,
              description: null,
              price: 0,
              is_featured: false,
              cadastral_number: item.cadastral_number,
              area_sotok: Number.isFinite(memberArea) ? (memberArea as number) : 0,
              ownership_type: item.ownership_type,
              bundle_id: bundleId,
              is_bundle_primary: false,
            })

            if (member) created.push(member)
          }

          if (created.length) setPlots([...created, ...plots])
        } else {
          const singleCadastral = isBundleMode && items.length === 1 ? items[0].cadastral_number : plotFormData.cadastral_number
          const singleArea = isBundleMode && items.length === 1 && items[0].area_sotok ? Number(items[0].area_sotok) : null

          const newPlot = await createPlot({
            ...plotFormData,
            cadastral_number: singleCadastral,
            area_sotok: Number.isFinite(singleArea) ? (singleArea as number) : plotFormData.area_sotok,
            bundle_id: null,
            is_bundle_primary: false,
          })
          if (newPlot) setPlots([newPlot, ...plots])
        }
      } else if (editingPlot) {
        const updatedPlot = await updatePlot(editingPlot.id, plotFormData)
        if (updatedPlot) setPlots(plots.map((p) => (p.id === editingPlot.id ? updatedPlot : p)))
      }
      handleCancelPlot()
    } catch (error) {
      console.error("Error saving plot:", error)
      alert("Ошибка сохранения.")
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePlot = async (id: string) => {
    if (!confirm("Удалить этот участок?")) return
    setLoading(true)
    try {
      await deletePlot(id)
      setPlots(plots.filter((p) => p.id !== id))
    } catch (error) {
      console.error("Error deleting plot:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPlots = useMemo(() => {
    // Added useMemo
    return plots.filter((plot) => {
      // Status filter
      if (plotStatusFilter === "active" && !plot.is_active) return false
      if (plotStatusFilter === "archived" && plot.is_active) return false
      if (plotStatusFilter === "reserved" && (!plot.is_active || !plot.is_reserved)) return false

      // District filter
      if (plotDistrictFilter !== "all" && plot.district !== plotDistrictFilter) return false

      // Settlement filter
      if (plotSettlementFilter !== "all" && plot.location !== plotSettlementFilter) return false

      // No-geo filter (show plots without coordinates)
      if (plotNoGeoFilter && Boolean(plot.has_coordinates)) return false

      // Search filter
      if (plotSearch) {
        const search = plotSearch.toLowerCase()
        return (
          plot.title?.toLowerCase().includes(search) ||
          plot.location?.toLowerCase().includes(search) ||
          plot.district?.toLowerCase().includes(search) ||
          plot.cadastral_number?.toLowerCase().includes(search) ||
          plot.description?.toLowerCase().includes(search)
        )
      }

      return true
    })
  }, [plots, plotSearch, plotStatusFilter, plotDistrictFilter, plotSettlementFilter, plotNoGeoFilter]) // Added dependencies

  // ============ LEAD HANDLERS ============
  const handleEditLead = (lead: Lead) => {
    setLeadFormData({
      wishes: lead.wishes || "",
      status: lead.status,
      manager_comment: lead.manager_comment || "",
      assigned_to: lead.assigned_to || "",
    })
    setEditingLead(lead)
  }

  const handleSaveLead = async () => {
    if (!editingLead) return
    setLoading(true)
    try {
      const updated = await updateLead(editingLead.id, leadFormData)
      if (updated) setLeads(leads.map((l) => (l.id === editingLead.id ? updated : l)))
      setEditingLead(null)
    } catch (error) {
      console.error("Error updating lead:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteLead = async (id: string) => {
    if (!confirm("Удалить эту заявку?")) return
    try {
      await deleteLead(id)
      setLeads(leads.filter((l) => l.id !== id))
    } catch (error) {
      console.error("Error deleting lead:", error)
    }
  }

  // ============ SUBSCRIBER HANDLERS ============
  const handleDeleteSubscriber = async (id: string) => {
    if (!confirm("Удалить подписчика?")) return
    try {
      await deleteSubscriber(id)
      setSubscribers(subscribers.filter((s) => s.id !== id))
    } catch (error) {
      console.error("Error deleting subscriber:", error)
    }
  }

  // ============ USER HANDLERS ============
  const handleCreateUser = () => {
    setUserFormData({ username: "", email: "", password: "", name: "", role: "manager" })
    setIsCreatingUser(true)
    setEditingUser(null)
  }

  const handleEditUser = (user: User) => {
    setUserFormData({ username: user.username || "", email: user.email, password: "", name: user.name, role: user.role })
    setEditingUser(user)
    setIsCreatingUser(false)
  }

  const handleCancelUser = () => {
    setUserFormData({ username: "", email: "", password: "", name: "", role: "manager" })
    setIsCreatingUser(false)
    setEditingUser(null)
    setShowPassword(false)
  }

  const handleSaveUser = async () => {
    // Validation for all required fields
    if (!userFormData.name.trim()) {
      alert("Имя обязательно")
      return
    }
    if (!userFormData.username.trim()) {
      alert("Имя пользователя обязательно")
      return
    }
    if (!userFormData.email.trim()) {
      alert("Email обязателен")
      return
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(userFormData.email)) {
      alert("Введите корректный email")
      return
    }

    setLoading(true)
    try {
      if (isCreatingUser) {
        if (!userFormData.password) {
          alert("Пароль обязателен для нового пользователя")
          setLoading(false)
          return
        }
        const result = await createUser(userFormData)
        if (result.success) {
          // Refresh the users list
          const updatedUsers = await getUsers()
          setUsers(updatedUsers)
          handleCancelUser()
        } else {
          alert(result.error || "Ошибка создания пользователя")
        }
      } else if (editingUser) {
        const updated = await updateUser(editingUser.id, {
          ...userFormData,
          password: userFormData.password || undefined,
          prevUsername: editingUser.username || undefined,
        })
        if (updated) {
          setUsers(users.map((u) => (u.id === editingUser.id ? updated : u)))
          handleCancelUser()
        }
      }
    } catch (error) {
      console.error("Error saving user:", error)
      alert("Ошибка сохранения пользователя")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Удалить пользователя?")) return
    try {
      await deleteUser(id)
      setUsers(users.filter((u) => u.id !== id))
    } catch (error) {
      console.error("Error deleting user:", error)
    }
  }

  // NEWS HANDLERS
  const handleCreateNews = () => {
    setNewsFormData({ title: "", content: "", author: "", image_url: "", is_published: false })
    setIsCreatingNews(true)
    setEditingNews(null)
  }

  const handleEditNews = (newsItem: News) => {
    setNewsFormData(newsItem)
    setEditingNews(newsItem)
    setIsCreatingNews(false)
  }

  const handleCancelNews = () => {
    setNewsFormData({ title: "", content: "", author: "", image_url: "", is_published: false })
    setIsCreatingNews(false)
    setEditingNews(null)
  }

  const handleSaveNews = async () => {
    setLoading(true)
    try {
      if (isCreatingNews) {
        const newNewsItem = await createNewsAction({
          title: newsFormData.title || "",
          content: newsFormData.content || "",
          image_url: newsFormData.image_url || undefined,
        })
        if (newNewsItem) setNews([newNewsItem, ...news])
      } else if (editingNews) {
        const updatedNewsItem = await updateNewsAction(editingNews.id, {
          title: newsFormData.title,
          content: newsFormData.content,
          image_url: newsFormData.image_url || undefined,
          is_published: newsFormData.is_published,
        })
        if (updatedNewsItem) setNews(news.map((n) => (n.id === editingNews.id ? updatedNewsItem : n)))
      }
      handleCancelNews()
    } catch (error) {
      console.error("Error saving news:", error)
      alert("Ошибка сохранения новости.")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteNews = async (id: string) => {
    if (!confirm("Удалить эту новость?")) return
    setLoading(true)
    try {
      await deleteNewsAction(id)
      setNews(news.filter((n) => n.id !== id))
    } catch (error) {
      console.error("Error deleting news:", error)
    } finally {
      setLoading(false)
    }
  }

  // ============ FAQ HANDLERS ============
  const handleCreateFaq = () => {
    setFaqFormData({ question: "", answer: "", category: "general", is_active: true })
    setIsCreatingFaq(true)
    setEditingFaq(null)
  }

  const handleEditFaq = (item: FaqItem) => {
    setFaqFormData(item)
    setEditingFaq(item)
    setIsCreatingFaq(false)
  }

  const handleCancelFaq = () => {
    setFaqFormData({ question: "", answer: "", category: "general", is_active: true })
    setIsCreatingFaq(false)
    setEditingFaq(null)
  }

  const handleSaveFaq = async () => {
    setLoading(true)
    try {
      if (isCreatingFaq) {
        const newItem = await createFaqItem(faqFormData)
        if (newItem) setFaqItems([...faqItems, newItem])
      } else if (editingFaq) {
        const updatedItem = await updateFaqItem(editingFaq.id, faqFormData)
        if (updatedItem) setFaqItems(faqItems.map((f) => (f.id === editingFaq.id ? updatedItem : f)))
      }
      handleCancelFaq()
    } catch (error) {
      console.error("Error saving faq:", error)
      alert("Ошибка сохранения FAQ.")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteFaq = async (id: string) => {
    if (!confirm("Удалить этот вопрос?")) return
    setLoading(true)
    try {
      await deleteFaqItem(id)
      setFaqItems(faqItems.filter((f) => f.id !== id))
    } catch (error) {
      console.error("Error deleting faq:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleReorderFaq = async (updates: { id: string; sort_order: number }[]) => {
    try {
      // Optimistically update local state
      const reorderedItems = [...faqItems].sort((a, b) => {
        const ua = updates.find(u => u.id === a.id)
        const ub = updates.find(u => u.id === b.id)
        if (ua && ub) return ua.sort_order - ub.sort_order
        return 0
      })
      setFaqItems(reorderedItems)

      await reorderFaqItems(updates)
    } catch (error) {
      console.error("Error reordering faq:", error)
      // Re-fetch to sync if failed
      const freshItems = await getFaqItems()
      setFaqItems(freshItems)
    }
  }

  async function handleLogout() {
    const { logoutAdmin } = await import("@/app/actions")
    await logoutAdmin()
    router.push("/admin/login")
    router.refresh()
  }

  // ============ COMMERCIAL PROPOSAL HANDLERS ============
  const handleOpenProposalDialog = async (lead: Lead) => {
    setSelectedLead(lead)
    setShowProposalDialog(true)
    setProposalTitle(`Коммерческое предложение для ${lead.name}`)
    setProposalDescription(lead.wishes || "")
    setSelectedPlots([])
    setDistrictFilter("all") // Resetting the proposal dialog's district filter

    // Load available plots
    const plots = await getLandPlots()
    setAvailablePlots(plots)

    // Load existing proposals for this lead
    const proposals = await getProposalsByLead(lead.id)
    setLeadProposals((prev) => ({ ...prev, [lead.id]: proposals }))
  }

  const handleViewProposal = async (proposalId: string) => {
    const proposal = await getProposalById(proposalId)
    if (proposal) {
      // Fetch organization settings if not already loaded, needed for PDF generation
      if (!orgSettings) {
        setLoadingSettings(true)
        const settings = await getOrganizationSettings()
        setOrgSettings(settings)
        setLoadingSettings(false)
      }
      setSelectedProposal(proposal)
      setShowProposalPreview(true)
    }
  }

  const handleCreateProposal = async () => {
    if (!selectedLead || selectedPlots.length === 0) {
      alert("Выберите хотя бы один участок")
      return
    }

    setLoading(true)
    const result = await createProposal({
      lead_id: selectedLead.id,
      title: proposalTitle,
      description: proposalDescription,
      plot_ids: selectedPlots,
    })
    setLoading(false)

    if (result.success) {
      setShowProposalDialog(false)
      setSelectedLead(null)
      setSelectedPlots([])
      // Refresh proposals for the lead
      const proposals = await getProposalsByLead(selectedLead.id)
      setLeadProposals((prev) => ({ ...prev, [selectedLead.id]: proposals }))
    } else {
      alert(result.error || "Ошибка создания КП")
    }
  }

  const togglePlotSelection = (plotId: string) => {
    setSelectedPlots((prev) => (prev.includes(plotId) ? prev.filter((id) => id !== plotId) : [...prev, plotId]))
  }

  const selectAllPlotsInDistrict = (district: string) => {
    const districtPlots = availablePlots.filter((plot) => {
      const matchesDistrict = district === "all" || plot.district === district
      const matchesSettlement = !settlementFilter ||
        (plot.location && plot.location.toLowerCase().includes(settlementFilter.toLowerCase()))
      const matchesCadastral = !cadastralFilter ||
        (plot.cadastral_number && plot.cadastral_number.toLowerCase().includes(cadastralFilter.toLowerCase()))

      return matchesDistrict && matchesSettlement && matchesCadastral
    })

    setSelectedPlots((prev) => {
      // If all filtered plots are already selected, deselect all
      const allSelected = districtPlots.every((plot) => prev.includes(plot.id))
      if (allSelected) {
        return prev.filter((id) => !districtPlots.some((p) => p.id === id))
      }
      // Otherwise add all filtered plots that aren't already selected
      const newSelections = districtPlots
        .filter((plot) => !prev.includes(plot.id))
        .map((plot) => plot.id)
      return [...prev, ...newSelections]
    })
  }

  // This filteredPlots is specific to the proposal dialog
  const filteredPlotsForProposal =
    districtFilter === "all" ? availablePlots : availablePlots.filter((plot) => {
      const matchesDistrict = plot.district === districtFilter
      const matchesSettlement = !settlementFilter ||
        (plot.location && plot.location.toLowerCase().includes(settlementFilter.toLowerCase()))
      const matchesCadastral = !cadastralFilter ||
        (plot.cadastral_number && plot.cadastral_number.toLowerCase().includes(cadastralFilter.toLowerCase()))

      return matchesDistrict && matchesSettlement && matchesCadastral
    })

  // Group plots by district for proposal dialog
  const plotsByDistrict = availablePlots.reduce(
    (acc, plot) => {
      if (!acc[plot.district]) {
        acc[plot.district] = []
      }
      acc[plot.district].push(plot)
      return acc
    },
    {} as Record<string, LandPlot[]>,
  )

  // Refresh stats periodically or on relevant actions
  useEffect(() => {
    const intervalId = setInterval(async () => {
      try {
        const fetchedStats = await getAdminStats()
        // Assuming stats state exists and is updated here
        // setStats(fetchedStats); // This would require a stats state variable
      } catch (error) {
        console.error("Error fetching stats:", error)
      }
    }, 60000) // Fetch every minute

    return () => clearInterval(intervalId)
  }, []) // Empty dependency array means this runs once on mount and cleanup on unmount

  useEffect(() => {
    const loadProposals = async () => {
      if (leads.length > 0) {
        const leadIds = leads.map((l) => l.id)
        const proposals = await getAllProposalsForLeads(leadIds)
        setLeadProposals(proposals)
      }
    }
    loadProposals()
  }, [leads])

  // Load address data from database on mount
  useEffect(() => {
    const loadAddressData = async () => {
      setLoadingAddresses(true)
      try {
        const districtsData = await getDistricts()
        console.log("[AdminDashboard] Loaded districts:", districtsData)
        setDistricts(districtsData)
      } catch (error) {
        console.error("Error loading address data:", error)
      } finally {
        setLoadingAddresses(false)
      }
    }
    loadAddressData()
  }, [])

  // Load settlements when district changes
  useEffect(() => {
    const loadSettlements = async () => {
      if (districtFilter && districtFilter !== "all") {
        try {
          const settlementsData = await getSettlementsByDistrictName(districtFilter)
          setProposalSettlements(settlementsData)
        } catch (error) {
          console.error("Error loading settlements:", error)
        }
      } else {
        setProposalSettlements([])
      }
    }
    loadSettlements()
  }, [districtFilter])

  // Load settlements for plot filters when plot district changes
  useEffect(() => {
    const loadPlotSettlements = async () => {
      if (plotDistrictFilter && plotDistrictFilter !== "all") {
        try {
          const settlementsData = await getSettlementsByDistrictName(plotDistrictFilter)
          setPlotSettlements(settlementsData)
        } catch (error) {
          console.error("Error loading plot settlements:", error)
        }
      } else {
        setPlotSettlements([])
      }
    }
    loadPlotSettlements()
  }, [plotDistrictFilter])

  // Settings sections that require orgSettings
  const settingsSections: AdminSection[] = [
    "contacts",
    "social",
    "placeholders",
    "proposal-fields",
    "home-new-block",
    "home-promo",
    "map",
    "nspd",
    "chat-settings",
  ]
  const isSettingsSection = settingsSections.includes(activeSection)

  useEffect(() => {
    const loadOrgSettings = async () => {
      if (isSettingsSection && !orgSettings) {
        setLoadingSettings(true)
        try {
          const settings = await getOrganizationSettings()
          setOrgSettings(settings)
        } catch (error) {
          console.error("Error fetching organization settings:", error)
        } finally {
          setLoadingSettings(false)
        }
      }
    }
    loadOrgSettings()
  }, [activeSection, orgSettings, isSettingsSection])

  // Load placeholders when viewing that section
  useEffect(() => {
    const loadPlaceholders = async () => {
      if (activeSection === "placeholders" && placeholders.length === 0) {
        setLoadingPlaceholders(true)
        try {
          const res = await fetch("/api/admin/placeholders", { cache: "no-store" })
          const json = await res.json()
          if (json?.success) setPlaceholders(json.placeholders || [])
        } finally {
          setLoadingPlaceholders(false)
        }
      }
    }
    loadPlaceholders()
  }, [activeSection, placeholders.length])

  const handleSaveSettings = async (data: Partial<OrganizationSettings>) => {
    setLoadingSettings(true)
    try {
      const result = await updateOrganizationSettings(data)
      if (result.success) {
        // Re-fetch settings to ensure latest state is loaded
        const updated = await getOrganizationSettings()
        setOrgSettings(updated)
        alert("Настройки сохранены")
      } else {
        alert("Ошибка сохранения настроек: " + result.error)
      }
    } catch (error) {
      console.error("Error saving organization settings:", error)
      alert("Произошла ошибка при сохранении настроек.")
    } finally {
      setLoadingSettings(false)
    }
  }

  const handleDownloadProposalPDF = async () => {
    if (!selectedProposal) return
    if (isDownloadingProposalPDF) return

    setIsDownloadingProposalPDF(true)
    try {
      // Ensure settings are loaded before generating
      let settings = orgSettings
      if (!settings) {
        setLoadingSettings(true)
        settings = await getOrganizationSettings()
        setOrgSettings(settings)
        setLoadingSettings(false)
      }

      setPdfRenderSettings(settings)

      // Ensure the offscreen view is mounted with fresh settings
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

      const el = pdfCaptureRef.current
      if (!el) throw new Error("PDF capture element not found")

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")])

      const renderCanvas = async (ignoreImages: boolean) =>
        await html2canvas(el, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          allowTaint: false,
          onclone: (doc) => {
            const root = doc.querySelector<HTMLElement>(".pdf-capture-root")
            if (!root) return

            // Remove global styles to avoid unsupported lab/oklch from Tailwind/shadcn.
            // We'll rely on ProposalPDFView's own safe CSS and inline defaults.
            doc.querySelectorAll('link[rel="stylesheet"], style:not([data-pdf-safe])').forEach((n) => n.remove())

            // html2canvas doesn't support lab/oklab/oklch color functions.
            // Some Tailwind/shadcn setups can emit those via CSS variables.
            // Force safe colors inline in the cloned DOM so the parser never sees lab().
            const all = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))]
            for (const node of all) {
              node.style.color = "#000000"
              node.style.backgroundColor = "#ffffff"
              node.style.borderColor = "#e5e7eb"
              node.style.outlineColor = "#e5e7eb"
              node.style.boxShadow = "none"
              node.style.textShadow = "none"
              node.style.backgroundImage = "none"

                // SVG colors (if any)
                ; (node.style as unknown as { fill?: string }).fill = "#000000"
                ; (node.style as unknown as { stroke?: string }).stroke = "#000000"
            }
          },
          ignoreElements: ignoreImages
            ? (node) => (node as HTMLElement)?.tagName?.toLowerCase?.() === "img"
            : undefined,
        })

      let canvas: HTMLCanvasElement
      try {
        canvas = await renderCanvas(false)
      } catch (e) {
        // Most common reason: cross-origin images tainting canvas. Retry without images.
        canvas = await renderCanvas(true)
      }

      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF({
        orientation: "p",
        unit: "pt",
        format: "a4",
      })

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()

      const imgWidth = pageWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft > 0) {
        position -= pageHeight
        pdf.addPage()
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      const safeTitle = (selectedProposal.title || "commercial-proposal")
        .replace(/[^a-zA-Z0-9а-яА-Я _-]+/g, "")
        .trim()
        .slice(0, 80)
      const filename = `${safeTitle || "commercial-proposal"}.pdf`

      pdf.save(filename)
    } catch (e) {
      console.error("Failed to generate PDF:", e)
      alert("Не удалось сформировать PDF. Попробуйте позже.")
    } finally {
      setIsDownloadingProposalPDF(false)
      setLoadingSettings(false)
    }
  }

  // Handler for refreshing data
  const handleRefresh = async () => {
    setLoading(true)
    try {
      const [updatedPlots, updatedStats] = await Promise.all([
        getLandPlots(),
        getAdminStats()
      ])
      setPlots(updatedPlots)
      setStats(updatedStats)
    } catch (error) {
      console.error("Error refreshing dashboard:", error)
    } finally {
      setLoading(false)
    }
  }

  // Placeholders handlers
  const handleUploadPlaceholder = async (file: File) => {
    setUploadingPlaceholder(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/admin/placeholders", { method: "POST", body: fd })
      const json = await res.json()
      if (!json?.success) {
        alert(json?.error || "Ошибка загрузки")
        return
      }
      // Reload placeholders
      const resReload = await fetch("/api/admin/placeholders", { cache: "no-store" })
      const jsonReload = await resReload.json()
      if (jsonReload?.success) setPlaceholders(jsonReload.placeholders || [])
    } finally {
      setUploadingPlaceholder(false)
    }
  }

  const handleDeletePlaceholder = async (placeholderId: string) => {
    if (!confirm("Удалить заглушку?")) return
    setLoadingPlaceholders(true)
    try {
      const res = await fetch("/api/admin/placeholders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeholderId }),
      })
      const json = await res.json()
      if (!json?.success) {
        alert(json?.error || "Ошибка удаления")
        return
      }
      // Reload placeholders
      const resReload = await fetch("/api/admin/placeholders", { cache: "no-store" })
      const jsonReload = await resReload.json()
      if (jsonReload?.success) setPlaceholders(jsonReload.placeholders || [])
    } finally {
      setLoadingPlaceholders(false)
    }
  }

  const newLeadsCount = leads.filter((l) => l.status === "new").length

  // Render content based on activeSection
  const renderSection = () => {
    switch (activeSection) {
      case "dashboard":
        // Calculate plot statistics
        const activePlots = plots.filter(p => p.is_active)
        const bundleIds = new Set(activePlots.filter(p => (p as any).bundle_id).map(p => (p as any).bundle_id))
        const plotsWithoutGeo = activePlots.filter(p => !p.coordinates_json && !p.center_lat && !p.center_lon)
        const plotsWithMultipleCadastral = activePlots.filter(p => p.additional_cadastral_numbers && p.additional_cadastral_numbers.length > 0)

        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white/50 p-4 rounded-2xl border border-blue-100 shadow-sm">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Обзор данных</h2>
                <p className="text-muted-foreground">Статистика по сайту и участкам в реальном времени</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
                className="rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Обновить данные
              </Button>
            </div>
            <StatsOverview initialStats={stats} />
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Финансы
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-secondary/50 rounded-xl">
                    <span className="text-muted-foreground">Общая стоимость в продаже</span>
                    <span className="font-bold text-lg">{formatPrice(initialStats.totalValue)}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-secondary/50 rounded-xl">
                    <span className="text-muted-foreground">Средняя цена за сотку</span>
                    <span className="font-bold text-lg">{formatPrice(initialStats.avgPricePerSotka)}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-secondary/50 rounded-xl">
                    <span className="text-muted-foreground">Всего соток</span>
                    <span className="font-bold text-lg">{initialStats.totalArea}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Plot Statistics Card */}
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Статистика участков
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-secondary/50 rounded-xl">
                    <span className="text-muted-foreground">Всего участков в базе</span>
                    <span className="font-bold text-lg">{plots.length}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-secondary/50 rounded-xl">
                    <span className="text-muted-foreground">Лотов (объединённых)</span>
                    <span className="font-bold text-lg">{plotsWithMultipleCadastral.length}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-secondary/50 rounded-xl">
                    <span className="text-muted-foreground">Без геометки</span>
                    <span className={`font-bold text-lg ${plotsWithoutGeo.length > 0 ? "text-orange-500" : "text-emerald-500"}`}>
                      {plotsWithoutGeo.length}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Последние заявки
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {leads.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Заявок пока нет</p>
                  ) : (
                    leads.slice(0, 5).map((lead) => (
                      <div key={lead.id} className="flex items-center justify-between py-3 border-b last:border-0">
                        <div>
                          <p className="font-medium">{lead.name}</p>
                          <p className="text-sm text-muted-foreground">{lead.phone}</p>
                        </div>
                        <Badge className={LEAD_STATUS_OPTIONS.find((s) => s.value === lead.status)?.color}>
                          {LEAD_STATUS_OPTIONS.find((s) => s.value === lead.status)?.label}
                        </Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )

      case "plots":
        return (
          <PlotsTab
            plots={plots}
            filteredPlots={filteredPlots}
            plotFormData={plotFormData}
            isBundleMode={isBundleMode}
            onIsBundleModeChange={setIsBundleMode}
            bundleRows={bundleRows}
            onBundleRowsChange={setBundleRows}
            isCreatingPlot={isCreatingPlot}
            editingPlot={editingPlot}
            loading={loading}
            plotSearch={plotSearch}
            plotStatusFilter={plotStatusFilter}
            plotDistrictFilter={plotDistrictFilter}
            plotSettlementFilter={plotSettlementFilter}
            plotNoGeoFilter={plotNoGeoFilter}
            districts={districts}
            settlements={plotSettlements}
            loadingAddresses={loadingAddresses}
            onCreate={handleCreatePlot}
            onCancel={handleCancelPlot}
            onSave={handleSavePlot}
            onEdit={handleEditPlot}
            onDelete={handleDeletePlot}
            onRefresh={handleRefresh}
            onChangeForm={(patch) => setPlotFormData({ ...plotFormData, ...patch })}
            onSearchChange={setPlotSearch}
            onStatusFilterChange={setPlotStatusFilter}
            onDistrictFilterChange={(v) => {
              setPlotDistrictFilter(v)
              setPlotSettlementFilter("all")
            }}
            onSettlementFilterChange={setPlotSettlementFilter}
            onNoGeoFilterChange={setPlotNoGeoFilter}
            onDistrictChange={async (districtName) => {
              if (districtName) {
                const settlementsData = await getSettlementsByDistrictName(districtName)
                setPlotSettlements(settlementsData)
              } else {
                setPlotSettlements([])
              }
            }}
          />
        )

      case "map":
        return (
          <MapTab
            plots={plots}
            mapSettings={orgSettings?.map_settings ?? null}
            orgSettings={orgSettings}
            loadingSettings={loadingSettings}
            onChangeSettings={(patch) => setOrgSettings(orgSettings ? { ...orgSettings, ...patch } : null)}
            onSaveSettings={handleSaveSettings}
          />
        )

      case "nspd":
        return (
          <NspdTab
            orgSettings={orgSettings}
            loadingSettings={loadingSettings}
            onChangeSettings={(patch: Partial<OrganizationSettings>) => setOrgSettings(orgSettings ? { ...orgSettings, ...patch } : null)}
            onSaveSettings={handleSaveSettings}
          />
        )

      case "import":
        return <ImportTab onRefresh={handleRefresh} />

      case "settlement-descriptions":
        return <SettlementDescriptionsTab />

      case "duplicate-addresses":
        return <DuplicateAddressesTab />

      case "leads":
        return (
          <LeadsTab
            leads={leads}
            leadFormData={leadFormData}
            editingLead={editingLead}
            loading={loading}
            leadProposals={leadProposals}
            onEditLead={handleEditLead}
            onCancelEdit={() => setEditingLead(null)}
            onUpdateLeadForm={(patch) => setLeadFormData({ ...leadFormData, ...patch })}
            onSaveLead={handleSaveLead}
            onDeleteLead={handleDeleteLead}
            onOpenProposalDialog={handleOpenProposalDialog}
            onViewProposal={handleViewProposal}
          />
        )

      case "subscribers":
        return (
          <SubscribersTab
            subscribers={subscribers}
            onToggleActive={async (sub, next) => {
              await updateSubscriber(sub.id, next)
              const updatedSubscribers = await getSubscribers()
              setSubscribers(updatedSubscribers)
            }}
            onDelete={handleDeleteSubscriber}
          />
        )

      case "proposals":
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Коммерческие предложения</h2>
            <p className="text-muted-foreground">Управление КП доступно через раздел "Заявки"</p>
          </div>
        )

      case "news":
        return (
          <NewsTab
            news={news}
            newsFormData={newsFormData}
            isCreatingNews={isCreatingNews}
            editingNews={editingNews}
            loading={loading}
            onCreate={handleCreateNews}
            onCancel={handleCancelNews}
            onSave={handleSaveNews}
            onEdit={handleEditNews}
            onDelete={handleDeleteNews}
            onChangeForm={(patch) => setNewsFormData({ ...newsFormData, ...patch })}
          />
        )

      case "faq":
        return (
          <FaqTab
            faqItems={faqItems}
            faqFormData={faqFormData}
            isCreatingFaq={isCreatingFaq}
            editingFaq={editingFaq}
            loading={loading}
            onCreate={handleCreateFaq}
            onCancel={handleCancelFaq}
            onSave={handleSaveFaq}
            onEdit={handleEditFaq}
            onDelete={handleDeleteFaq}
            onChangeForm={(patch) => setFaqFormData({ ...faqFormData, ...patch })}
            onReorder={handleReorderFaq}
          />
        )

      case "legal":
        return (
          <LegalTab
            items={legalContent}
            onCreate={async (data) => {
              const res = await createLegalContent(data)
              const fresh = await getLegalContent()
              setLegalContent(fresh)
              return res
            }}
            onUpdate={async (id, data) => {
              const res = await updateLegalContent(id, data)
              const fresh = await getLegalContent()
              setLegalContent(fresh)
              return res
            }}
            onDelete={async (id) => {
              const res = await deleteLegalContent(id)
              const fresh = await getLegalContent()
              setLegalContent(fresh)
              return res
            }}
          />
        )


      case "landing":
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Настройки лендинга</h2>
            <p className="text-muted-foreground">Используйте раздел "Лендинг" в категории "Управление" для настройки блока преимуществ</p>
          </div>
        )

      case "users":
        return (
          <UsersTab
            users={users}
            userFormData={userFormData}
            isCreatingUser={isCreatingUser}
            editingUser={editingUser}
            showPassword={showPassword}
            loading={loading}
            onCreate={handleCreateUser}
            onCancel={handleCancelUser}
            onSave={handleSaveUser}
            onEdit={handleEditUser}
            onDelete={handleDeleteUser}
            onToggleShowPassword={() => setShowPassword(!showPassword)}
            onChangeForm={(patch) => setUserFormData({ ...userFormData, ...patch })}
          />
        )

      case "contacts":
        return orgSettings ? (
          <ContactInfoCard
            orgSettings={orgSettings}
            loadingSettings={loadingSettings}
            onChange={(patch) => setOrgSettings(orgSettings ? { ...orgSettings, ...patch } : null)}
            onSave={handleSaveSettings}
          />
        ) : (
          <Card className="rounded-2xl">
            <CardContent className="p-8 text-center text-muted-foreground">
              {loadingSettings ? "Загрузка настроек..." : "Не удалось загрузить настройки"}
            </CardContent>
          </Card>
        )

      case "social":
        return orgSettings ? (
          <SocialMediaCard
            orgSettings={orgSettings}
            loadingSettings={loadingSettings}
            onChange={(patch) => setOrgSettings(orgSettings ? { ...orgSettings, ...patch } : null)}
            onSave={handleSaveSettings}
          />
        ) : (
          <Card className="rounded-2xl">
            <CardContent className="p-8 text-center text-muted-foreground">
              {loadingSettings ? "Загрузка настроек..." : "Не удалось загрузить настройки"}
            </CardContent>
          </Card>
        )

      case "placeholders":
        return (
          <PlaceholdersCard
            placeholders={placeholders}
            loading={loadingPlaceholders}
            uploading={uploadingPlaceholder}
            onUpload={(file) => void handleUploadPlaceholder(file)}
            onDelete={(id) => void handleDeletePlaceholder(id)}
            onPreview={() => { }}
          />
        )

      case "proposal-fields":
        return orgSettings ? (
          <ProposalTemplateEditor
            settings={orgSettings}
            loading={loadingSettings}
            saving={loadingSettings}
            onChange={(patch) => setOrgSettings(orgSettings ? { ...orgSettings, ...patch } : null)}
            onSave={() => handleSaveSettings(orgSettings)}
            onPreview={() => window.open("/admin/proposal-preview", "_blank")}
          />
        ) : (
          <Card className="rounded-2xl">
            <CardContent className="p-8 text-center text-muted-foreground">
              {loadingSettings ? "Загрузка настроек..." : "Не удалось загрузить настройки"}
            </CardContent>
          </Card>
        )

      case "home-new-block":
        return orgSettings ? (
          <HomeNewBlockCard orgSettings={orgSettings} loadingSettings={loadingSettings} onSave={handleSaveSettings} />
        ) : (
          <Card className="rounded-2xl">
            <CardContent className="p-8 text-center text-muted-foreground">
              {loadingSettings ? "Загрузка настроек..." : "Не удалось загрузить настройки"}
            </CardContent>
          </Card>
        )

      case "home-promo":
        return orgSettings ? (
          <HomePromoCard
            orgSettings={orgSettings}
            loadingSettings={loadingSettings}
            onChange={(patch) => setOrgSettings(orgSettings ? { ...orgSettings, ...patch } : null)}
            onSave={handleSaveSettings}
          />
        ) : (
          <Card className="rounded-2xl">
            <CardContent className="p-8 text-center text-muted-foreground">
              {loadingSettings ? "Загрузка настроек..." : "Не удалось загрузить настройки"}
            </CardContent>
          </Card>
        )

      case "telegram-bot":
        return <TelegramSettingsCard />

      case "chat-settings":
        return orgSettings ? (
          <ChatSettingsCard
            orgSettings={orgSettings}
            loadingSettings={loadingSettings}
            onChange={(patch) => setOrgSettings(orgSettings ? { ...orgSettings, ...patch } : null)}
            onSave={handleSaveSettings}
          />
        ) : (
          <Card className="rounded-2xl">
            <CardContent className="p-8 text-center text-muted-foreground">
              {loadingSettings ? "Загрузка настроек..." : "Не удалось загрузить настройки"}
            </CardContent>
          </Card>
        )

      case "telegram-templates":
        return <TelegramTemplatesCard />

      case "social-networks":
        return <PublicationsTab />

      default:
        return (
          <div className="text-center py-8 text-muted-foreground">
            Раздел в разработке
          </div>
        )
    }
  }

  return (
    <AdminLayout
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      onLogout={handleLogout}
      newLeadsCount={newLeadsCount}
    >
      {renderSection()}

      {/* DIALOGS */}
      <CreateProposalDialog
        open={showProposalDialog}
        onOpenChange={setShowProposalDialog}
        selectedLead={selectedLead}
        proposalTitle={proposalTitle}
        proposalDescription={proposalDescription}
        onChangeProposalTitle={setProposalTitle}
        onChangeProposalDescription={setProposalDescription}
        districts={districts}
        settlements={proposalSettlements}
        loadingAddresses={loadingAddresses}
        districtFilter={districtFilter}
        settlementFilter={settlementFilter}
        cadastralFilter={cadastralFilter}
        onChangeDistrictFilter={setDistrictFilter}
        onChangeSettlementFilter={setSettlementFilter}
        onChangeCadastralFilter={setCadastralFilter}
        selectedPlots={selectedPlots}
        onClearSelectedPlots={() => setSelectedPlots([])}
        filteredPlotsForProposal={filteredPlotsForProposal}
        onTogglePlotSelection={togglePlotSelection}
        onSelectAllPlotsInDistrict={selectAllPlotsInDistrict}
        loading={loading}
        onCreateProposal={handleCreateProposal}
      />

      {/* Offscreen PDF render target */}
      {selectedProposal && (
        <div
          ref={pdfCaptureRef}
          className="pdf-capture-root fixed left-[-10000px] top-0 bg-white"
          style={{ width: 794 }}
        >
          <ProposalPDFView proposal={selectedProposal} settings={pdfRenderSettings} />
        </div>
      )}

      <ProposalPreviewDialog
        open={showProposalPreview && !!selectedProposal}
        onOpenChange={setShowProposalPreview}
        proposal={selectedProposal}
        leadPhone={selectedLead?.phone || null}
        onPrint={handleDownloadProposalPDF}
      />
    </AdminLayout>
  )
}

