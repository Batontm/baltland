"use client"

import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    LayoutDashboard,
    Home,
    TreePine,
    Download,
    Users,
    MessageSquare,
    Bell,
    FileText,
    Newspaper,
    HelpCircle,
    Settings,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Phone,
    Share2,
    Image,
    FileEdit,
    Palette,
    Bot,
    MessageCircle,
    LogOut,
    ArrowLeft,
    AlertTriangle,
    ShieldCheck,
    Sparkles,
    Send,
} from "lucide-react"


export type AdminSection =
    | "dashboard"
    | "plots"
    | "nspd"
    | "import"
    | "settlement-descriptions"
    | "duplicate-addresses"
    | "map"
    | "leads"
    | "subscribers"
    | "proposals"
    | "news"
    | "landing"
    | "users"
    | "contacts"
    | "home-new-block"
    | "social"
    | "placeholders"
    | "proposal-fields"
    | "chat-settings"
    | "telegram-bot"
    | "telegram-templates"
    | "social-networks"
    | "faq"
    | "legal"

interface MenuGroup {
    id: string
    label: string
    icon: React.ReactNode
    items: MenuItem[]
}

interface MenuItem {
    id: AdminSection
    label: string
    icon: React.ReactNode
    badge?: number
}

interface AdminSidebarProps {
    activeSection: AdminSection
    onSectionChange: (section: AdminSection) => void
    onLogout: () => void
    newLeadsCount?: number
}

const menuGroups: MenuGroup[] = [
    {
        id: "realty",
        label: "НЕДВИЖИМОСТЬ",
        icon: <Home className="h-4 w-4" />,
        items: [
            { id: "plots", label: "Участки", icon: <TreePine className="h-4 w-4" /> },
            { id: "social-networks", label: "Публикации", icon: <Send className="h-4 w-4" /> },
            { id: "map", label: "Карта", icon: <Share2 className="h-4 w-4" /> },
            { id: "nspd", label: "НСПД", icon: <ShieldCheck className="h-4 w-4" /> },
            { id: "import", label: "Импорт", icon: <Download className="h-4 w-4" /> },
            { id: "settlement-descriptions", label: "Описание поселков", icon: <FileText className="h-4 w-4" /> },
            { id: "duplicate-addresses", label: "Дубли адресов", icon: <AlertTriangle className="h-4 w-4" /> },
        ],
    },
    {
        id: "clients",
        label: "КЛИЕНТЫ",
        icon: <Users className="h-4 w-4" />,
        items: [
            { id: "leads", label: "Заявки", icon: <MessageSquare className="h-4 w-4" /> },
            { id: "subscribers", label: "Подписки", icon: <Bell className="h-4 w-4" /> },
        ],
    },
    {
        id: "content",
        label: "КОНТЕНТ",
        icon: <FileText className="h-4 w-4" />,
        items: [
            { id: "news", label: "Новости", icon: <Newspaper className="h-4 w-4" /> },
            { id: "faq", label: "FAQ", icon: <HelpCircle className="h-4 w-4" /> },
            { id: "legal", label: "Юрид. чистота", icon: <ShieldCheck className="h-4 w-4" /> },
        ],
    },
    {
        id: "management",
        label: "САЙТ",
        icon: <Settings className="h-4 w-4" />,
        items: [
            { id: "users", label: "Пользователи", icon: <Users className="h-4 w-4" /> },
            { id: "contacts", label: "Контакты", icon: <Phone className="h-4 w-4" /> },
            { id: "home-new-block", label: "Главная: новый блок", icon: <Sparkles className="h-4 w-4" /> },
            { id: "social", label: "Соцсети", icon: <Share2 className="h-4 w-4" /> },
            { id: "placeholders", label: "Плейсхолдеры", icon: <Image className="h-4 w-4" /> },
            { id: "proposal-fields", label: "КП поля", icon: <FileEdit className="h-4 w-4" /> },
            { id: "chat-settings", label: "Онлайн-чат", icon: <MessageCircle className="h-4 w-4" /> },
        ],
    },
    {
        id: "telegram",
        label: "ТЕЛЕГРАМ",
        icon: <Bot className="h-4 w-4" />,
        items: [
            { id: "telegram-bot", label: "Уведомления", icon: <Settings className="h-4 w-4" /> },
            { id: "telegram-templates", label: "Шаблоны", icon: <MessageCircle className="h-4 w-4" /> },
        ],
    },
]

export function AdminSidebar({ activeSection, onSectionChange, onLogout, newLeadsCount = 0 }: AdminSidebarProps) {
    const [collapsed, setCollapsed] = useState(false)
    const [expandedGroups, setExpandedGroups] = useState<string[]>(["realty", "clients", "content", "management", "telegram"])

    const toggleGroup = (groupId: string) => {
        setExpandedGroups((prev) =>
            prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
        )
    }

    const getActiveGroup = () => {
        for (const group of menuGroups) {
            if (group.items.some((item) => item.id === activeSection)) {
                return group.id
            }
        }
        return null
    }

    return (
        <aside
            className={cn(
                "flex flex-col bg-white text-slate-800 border-r border-slate-200 transition-all duration-300 h-full overflow-hidden",
                collapsed ? "w-16" : "w-64"
            )}
        >
            {/* Logo */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200">
                {!collapsed && (
                    <Link href="/" className="flex items-center gap-2 text-emerald-600 font-bold text-lg">
                        <Home className="h-5 w-5" />
                        БалтикЗемля
                    </Link>
                )}
                {collapsed && (
                    <Link href="/" className="mx-auto text-emerald-600">
                        <Home className="h-5 w-5" />
                    </Link>
                )}
            </div>

            {/* Menu */}
            <ScrollArea className="flex-1 min-h-0 py-4">
                <nav className="space-y-1 px-2">
                    {/* Dashboard - standalone item */}
                    <button
                        onClick={() => onSectionChange("dashboard")}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-2",
                            "hover:bg-slate-100",
                            activeSection === "dashboard"
                                ? "bg-emerald-50 text-emerald-700 border-l-2 border-emerald-500"
                                : "text-slate-700"
                        )}
                        title={collapsed ? "Дашборд" : undefined}
                    >
                        <LayoutDashboard className="h-4 w-4" />
                        {!collapsed && <span>Дашборд</span>}
                    </button>

                    {/* Separator */}
                    <div className="h-px bg-slate-200 my-2" />

                    {menuGroups.map((group) => {
                        const isExpanded = expandedGroups.includes(group.id)
                        const isActiveGroup = getActiveGroup() === group.id

                        return (
                            <div key={group.id} className="space-y-1">
                                {/* Group header */}
                                <button
                                    onClick={() => !collapsed && toggleGroup(group.id)}
                                    className={cn(
                                        "w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider",
                                        "text-slate-500 hover:text-slate-700 transition-colors",
                                        isActiveGroup && "text-emerald-600"
                                    )}
                                >
                                    {group.icon}
                                    {!collapsed && (
                                        <>
                                            <span className="flex-1 text-left">{group.label}</span>
                                            <ChevronDown
                                                className={cn(
                                                    "h-3 w-3 transition-transform",
                                                    isExpanded ? "rotate-0" : "-rotate-90"
                                                )}
                                            />
                                        </>
                                    )}
                                </button>

                                {/* Group items */}
                                {(isExpanded || collapsed) && (
                                    <div className={cn("space-y-0.5", !collapsed && "ml-4")}>
                                        {group.items.map((item) => {
                                            const isActive = activeSection === item.id
                                            const showBadge = item.id === "leads" && newLeadsCount > 0

                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={() => onSectionChange(item.id)}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                                                        "hover:bg-slate-100 hover:text-slate-900",
                                                        isActive
                                                            ? "bg-emerald-50 text-emerald-700 border-l-2 border-emerald-500"
                                                            : "text-slate-600"
                                                    )}
                                                    title={collapsed ? item.label : undefined}
                                                >
                                                    {item.icon}
                                                    {!collapsed && (
                                                        <>
                                                            <span className="flex-1 text-left">{item.label}</span>
                                                            {showBadge && (
                                                                <Badge className="h-5 min-w-5 p-0 justify-center bg-red-500 text-white text-xs">
                                                                    {newLeadsCount}
                                                                </Badge>
                                                            )}
                                                        </>
                                                    )}
                                                    {collapsed && showBadge && (
                                                        <Badge className="absolute -top-1 -right-1 h-4 min-w-4 p-0 justify-center bg-red-500 text-white text-xs">
                                                            {newLeadsCount}
                                                        </Badge>
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </nav>
            </ScrollArea>

            {/* Footer */}
            <div className="border-t border-slate-200 p-2 space-y-2">
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    {collapsed ? (
                        <ChevronRight className="h-4 w-4 mx-auto" />
                    ) : (
                        <>
                            <ChevronLeft className="h-4 w-4" />
                            <span>Скрыть меню</span>
                        </>
                    )}
                </button>

                <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                    <LogOut className="h-4 w-4" />
                    {!collapsed && <span>Выйти</span>}
                </button>
            </div>
        </aside>
    )
}
