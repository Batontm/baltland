import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { OrganizationSettings } from "@/lib/types"

interface ContactInfoCardProps {
  orgSettings: OrganizationSettings
  loadingSettings: boolean
  onChange: (patch: Partial<OrganizationSettings>) => void
  onSave: (data: Partial<OrganizationSettings>) => void
}

export function ContactInfoCard({ orgSettings, loadingSettings, onChange, onSave }: ContactInfoCardProps) {
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)

  const handleUploadLogo = async (file: File) => {
    setUploadingLogo(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("type", "logos")

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: fd,
      })
      const json = await res.json()
      if (!json?.success) {
        alert(json?.error || "Ошибка загрузки")
        return
      }
      onChange({ logo_url: json.url })
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleUploadFavicon = async (file: File) => {
    setUploadingFavicon(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("type", "favicons")

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: fd,
      })
      const json = await res.json()
      if (!json?.success) {
        alert(json?.error || "Ошибка загрузки")
        return
      }

      onChange({ favicon_url: json.url })
    } finally {
      setUploadingFavicon(false)
    }
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Контактная информация</CardTitle>
        <CardDescription>Используется на сайте и в коммерческих предложениях</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Название организации</Label>
            <Input id="org-name" value={orgSettings.organization_name} onChange={(e) => onChange({ organization_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-phone">Телефон</Label>
            <Input id="org-phone" type="tel" value={orgSettings.phone} onChange={(e) => onChange({ phone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-email">Email</Label>
            <Input id="org-email" type="email" value={orgSettings.email} onChange={(e) => onChange({ email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-address">Адрес</Label>
            <Input id="org-address" value={orgSettings.address} onChange={(e) => onChange({ address: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-working-hours">График работы</Label>
            <Input
              id="org-working-hours"
              value={orgSettings.working_hours || ""}
              onChange={(e) => onChange({ working_hours: e.target.value })}
              placeholder="Пн-Вс: 9:00 - 20:00"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="org-logo">URL логотипа</Label>
            <Input
              id="org-logo"
              type="url"
              placeholder="https://example.com/logo.png"
              value={orgSettings.logo_url || ""}
              onChange={(e) => onChange({ logo_url: e.target.value })}
            />
            <div className="flex flex-col gap-2">
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void handleUploadLogo(file)
                  e.currentTarget.value = ""
                }}
                disabled={uploadingLogo || loadingSettings}
              />
              {orgSettings.logo_url ? (
                <div className="flex items-center gap-3">
                  <img src={orgSettings.logo_url} alt="logo" className="h-10 w-auto object-contain bg-transparent" />
                  <span className="text-xs text-muted-foreground break-all">{orgSettings.logo_url}</span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Можно вставить URL вручную или загрузить файл выше</p>
              )}
              {uploadingLogo ? <p className="text-xs text-muted-foreground">Загрузка...</p> : null}
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="org-favicon">URL favicon (иконка вкладки)</Label>
            <Input
              id="org-favicon"
              type="url"
              placeholder="https://example.com/favicon.png"
              value={orgSettings.favicon_url || ""}
              onChange={(e) => onChange({ favicon_url: e.target.value })}
            />
            <div className="flex flex-col gap-2">
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void handleUploadFavicon(file)
                  e.currentTarget.value = ""
                }}
                disabled={uploadingFavicon || loadingSettings}
              />
              {orgSettings.favicon_url ? (
                <div className="flex items-center gap-3">
                  <img src={orgSettings.favicon_url} alt="favicon" className="h-8 w-8 rounded" />
                  <span className="text-xs text-muted-foreground break-all">{orgSettings.favicon_url}</span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Можно вставить URL вручную или загрузить файл выше</p>
              )}
              {uploadingFavicon ? <p className="text-xs text-muted-foreground">Загрузка...</p> : null}
            </div>
          </div>
        </div>
        <Button onClick={() => onSave(orgSettings)} disabled={loadingSettings}>
          {loadingSettings ? "Сохранение..." : "Сохранить контактную информацию"}
        </Button>
      </CardContent>
    </Card>
  )
}
