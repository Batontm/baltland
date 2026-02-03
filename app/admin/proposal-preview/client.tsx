"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Maximize2, Minimize2, Printer } from "lucide-react"
import type { OrganizationSettings, LandPlot } from "@/lib/types"

interface ProposalPreviewPageClientProps {
    settings: OrganizationSettings | null
}

// Demo plot data for preview
const DEMO_PLOTS: LandPlot[] = [
    {
        id: "demo-1",
        title: "Участок в Зеленоградске",
        description: "Красивый участок с видом на море",
        price: 1500000,
        area_sotok: 8,
        district: "Зеленоградский район",
        location: "п. Зеленоградск",
        distance_to_sea: 500,
        land_status: "ИЖС",
        has_gas: true,
        has_electricity: true,
        has_water: false,
        has_installment: true,
        image_url: null,
        is_featured: true,
        is_active: true,
        cadastral_number: "39:05:060012:1234",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: "demo-2",
        title: "Участок в Светлогорске",
        description: "Тихое место рядом с лесом",
        price: 2200000,
        area_sotok: 12,
        district: "Светлогорский район",
        location: "п. Светлогорск",
        distance_to_sea: 1200,
        land_status: "ИЖС",
        has_gas: true,
        has_electricity: true,
        has_water: true,
        has_installment: false,
        image_url: null,
        is_featured: false,
        is_active: true,
        cadastral_number: "39:12:060015:5678",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
]

export default function ProposalPreviewPageClient({ settings }: ProposalPreviewPageClientProps) {
    const [isFullscreen, setIsFullscreen] = useState(false)

    const logoHeight = settings?.proposal_logo_size === "small" ? 32
        : settings?.proposal_logo_size === "large" ? 64
            : 48

    const headerFontSize = settings?.proposal_header_font_size || 28
    const bodyFontSize = settings?.proposal_body_font_size || 14
    const primaryColor = settings?.proposal_primary_color || "#000000"
    const accentColor = settings?.proposal_accent_color || "#22c55e"
    const headerBgColor = settings?.proposal_header_bg_color || "#ffffff"
    const fontFamily = settings?.proposal_font_family === "custom"
        ? "CustomProposalFont, Arial"
        : settings?.proposal_font_family || "Arial"

    const showContacts = settings?.proposal_contacts_position !== "footer-only"

    return (
        <div className={`min-h-screen bg-slate-100 ${isFullscreen ? "fixed inset-0 z-50" : ""}`}>
            {/* Toolbar */}
            <div className="bg-white border-b sticky top-0 z-10 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Назад в админку
                        </Button>
                    </Link>
                    <span className="text-muted-foreground">Предпросмотр КП</span>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.print()}>
                        <Printer className="h-4 w-4 mr-2" />
                        Печать
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setIsFullscreen(!isFullscreen)}>
                        {isFullscreen ? (
                            <Minimize2 className="h-4 w-4 mr-2" />
                        ) : (
                            <Maximize2 className="h-4 w-4 mr-2" />
                        )}
                        {isFullscreen ? "Свернуть" : "На весь экран"}
                    </Button>
                </div>
            </div>

            {/* Preview Container */}
            <div className="p-8 flex justify-center">
                <div
                    className="bg-white shadow-lg rounded-lg overflow-hidden"
                    style={{
                        width: 794,
                        minHeight: 1123,
                        fontFamily,
                        color: primaryColor,
                    }}
                >
                    {/* Custom font loader */}
                    {settings?.proposal_custom_font_url && (
                        <style>{`
              @font-face {
                font-family: 'CustomProposalFont';
                src: url('${settings.proposal_custom_font_url}') format('woff2');
                font-weight: normal;
                font-style: normal;
              }
            `}</style>
                    )}

                    <div className="p-8">
                        {/* Header */}
                        <div
                            className="border-b pb-6 mb-6"
                            style={{ backgroundColor: headerBgColor }}
                        >
                            <div className={`flex ${showContacts ? "justify-between" : "flex-col"} gap-4`}>
                                {/* Left: Logo & Org name */}
                                <div>
                                    {settings?.proposal_show_logo && settings?.logo_url && (
                                        <img
                                            src={settings.logo_url}
                                            alt="Logo"
                                            style={{ height: logoHeight }}
                                            className="mb-3"
                                        />
                                    )}
                                    {settings?.proposal_show_org_name && (
                                        <h1 style={{ fontSize: headerFontSize, fontWeight: 700 }}>
                                            {settings?.organization_name || "Название компании"}
                                        </h1>
                                    )}
                                    <p style={{ fontSize: bodyFontSize }} className="text-gray-500 mt-1">
                                        Коммерческое предложение
                                    </p>
                                </div>

                                {/* Right: Contacts */}
                                {showContacts && (
                                    <div className="text-right" style={{ fontSize: bodyFontSize - 2 }}>
                                        {settings?.proposal_header_show_phone && settings?.phone && (
                                            <p>{settings.phone}</p>
                                        )}
                                        {settings?.proposal_header_show_email && settings?.email && (
                                            <p>{settings.email}</p>
                                        )}
                                        {settings?.proposal_header_show_address && settings?.address && (
                                            <p className="text-gray-500">{settings.address}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Plots section */}
                        <div className="mb-6">
                            <h2
                                style={{ fontSize: headerFontSize - 8, fontWeight: 700, color: primaryColor }}
                                className="mb-4"
                            >
                                Подобранные участки ({DEMO_PLOTS.length})
                            </h2>

                            <div className="space-y-4">
                                {DEMO_PLOTS.map((plot) => (
                                    <div
                                        key={plot.id}
                                        className="border rounded-lg p-4"
                                        style={{ borderColor: accentColor + "40" }}
                                    >
                                        <div className="flex gap-4">
                                            <div
                                                className="w-32 h-32 rounded-lg flex items-center justify-center text-white text-sm"
                                                style={{ backgroundColor: accentColor }}
                                            >
                                                Фото
                                            </div>
                                            <div className="flex-1">
                                                <h3
                                                    style={{ fontSize: bodyFontSize + 4, fontWeight: 600 }}
                                                    className="mb-2"
                                                >
                                                    {plot.location}
                                                </h3>
                                                <p style={{ fontSize: bodyFontSize }} className="text-gray-600 mb-2">
                                                    {plot.description}
                                                </p>
                                                <div
                                                    className="grid grid-cols-2 gap-x-4 gap-y-1"
                                                    style={{ fontSize: bodyFontSize - 1 }}
                                                >
                                                    <span>Площадь: {plot.area_sotok} сот.</span>
                                                    <span>Цена: {plot.price.toLocaleString("ru-RU")} ₽</span>
                                                    <span>Статус: {plot.land_status}</span>
                                                    <span style={{ fontFamily: "monospace" }}>КН: {plot.cadastral_number}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        {settings?.proposal_show_footer && (
                            <div
                                className="border-t pt-6 text-center text-gray-500"
                                style={{ fontSize: bodyFontSize - 2 }}
                            >
                                <p>{settings.proposal_footer_text || "Коммерческое предложение действительно на момент формирования"}</p>
                                <p className="mt-2">
                                    Свяжитесь с нами: {settings?.phone} • {settings?.email}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
