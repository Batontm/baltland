import { useEffect, useMemo, useState } from "react"
import type { OrganizationSettings, PlotPlaceholder } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { PlaceholdersCard } from "@/components/admin/dashboard/settings/placeholders-card"
import { ContactInfoCard } from "@/components/admin/dashboard/settings/contact-info-card"
import { SocialMediaCard } from "@/components/admin/dashboard/settings/social-media-card"
import { ProposalFieldsCard } from "@/components/admin/dashboard/settings/proposal-fields-card"
import { ChatSettingsCard } from "@/components/admin/dashboard/settings/chat-settings-card"
import { PlotDescriptionSettingsCard } from "@/components/admin/dashboard/settings/plot-description-settings-card"
import { PreviewDialog } from "@/components/admin/dashboard/settings/preview-dialog"
import { VKBulkExportCard } from "@/components/admin/dashboard/settings/vk-bulk-export-card"
import { AboutSettingsCard } from "@/components/admin/dashboard/settings/about-settings-card"
import { HomePromoCard } from "@/components/admin/dashboard/settings/home-promo-card"


interface SettingsTabProps {
  orgSettings: OrganizationSettings | null
  loadingSettings: boolean
  onChange: (patch: Partial<OrganizationSettings>) => void
  onSave: (data: Partial<OrganizationSettings>) => void
}

export function SettingsTab({ orgSettings, loadingSettings, onChange, onSave }: SettingsTabProps) {
  const [placeholders, setPlaceholders] = useState<PlotPlaceholder[]>([])
  const [loadingPlaceholders, setLoadingPlaceholders] = useState(false)
  const [uploadingPlaceholder, setUploadingPlaceholder] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const canLoad = useMemo(() => !!orgSettings, [orgSettings])

  const loadPlaceholders = async () => {
    setLoadingPlaceholders(true)
    try {
      const res = await fetch("/api/admin/placeholders", { cache: "no-store" })
      const json = await res.json()
      if (json?.success) setPlaceholders(json.placeholders || [])
    } finally {
      setLoadingPlaceholders(false)
    }
  }

  useEffect(() => {
    if (!canLoad) return
    loadPlaceholders()
  }, [canLoad])

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
      await loadPlaceholders()
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
      await loadPlaceholders()
    } finally {
      setLoadingPlaceholders(false)
    }
  }

  if (loadingSettings && !orgSettings) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-8 text-center text-muted-foreground">Загрузка настроек...</CardContent>
      </Card>
    )
  }

  if (!orgSettings) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-8 text-center text-muted-foreground">
          Не удалось загрузить настройки
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Настройки организации</h2>
      </div>

      <PlaceholdersCard
        placeholders={placeholders}
        loading={loadingPlaceholders}
        uploading={uploadingPlaceholder}
        onUpload={(file) => void handleUploadPlaceholder(file)}
        onDelete={(id) => void handleDeletePlaceholder(id)}
        onPreview={(url) => setPreviewUrl(url)}
      />

      <HomePromoCard orgSettings={orgSettings} loadingSettings={loadingSettings} onChange={onChange} onSave={onSave} />

      <PlotDescriptionSettingsCard orgSettings={orgSettings} loadingSettings={loadingSettings} onChange={onChange} onSave={onSave} />

      <ContactInfoCard orgSettings={orgSettings} loadingSettings={loadingSettings} onChange={onChange} onSave={onSave} />

      <SocialMediaCard orgSettings={orgSettings} loadingSettings={loadingSettings} onChange={onChange} onSave={onSave} />

      <ChatSettingsCard orgSettings={orgSettings} loadingSettings={loadingSettings} onChange={onChange} onSave={onSave} />

      <ProposalFieldsCard orgSettings={orgSettings} loadingSettings={loadingSettings} onChange={onChange} onSave={onSave} />

      <AboutSettingsCard settings={orgSettings} />

      <VKBulkExportCard />

      <PreviewDialog url={previewUrl} onClose={() => setPreviewUrl(null)} />
    </div>
  )
}

