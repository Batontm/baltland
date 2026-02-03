import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { OrganizationSettings } from "@/lib/types"

interface SocialMediaCardProps {
  orgSettings: OrganizationSettings
  loadingSettings: boolean
  onChange: (patch: Partial<OrganizationSettings>) => void
  onSave: (data: Partial<OrganizationSettings>) => void
}

export function SocialMediaCard({ orgSettings, loadingSettings, onChange, onSave }: SocialMediaCardProps) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Социальные сети</CardTitle>
        <CardDescription>Добавьте ссылки на социальные сети для отображения в шапке и футере</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-center gap-2 cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={orgSettings.show_social_media}
            onChange={(e) => onChange({ show_social_media: e.target.checked })}
            className="rounded"
          />
          <span className="font-medium">Показывать иконки социальных сетей</span>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 p-4 rounded-lg border">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={orgSettings.show_vk} onChange={(e) => onChange({ show_vk: e.target.checked })} className="rounded" />
              <span className="font-medium">ВКонтакте</span>
            </label>
            {orgSettings.show_vk && (
              <Input type="url" placeholder="https://vk.com/your_page" value={orgSettings.vk_url || ""} onChange={(e) => onChange({ vk_url: e.target.value })} />
            )}
          </div>

          <div className="space-y-2 p-4 rounded-lg border">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={orgSettings.show_telegram}
                onChange={(e) => onChange({ show_telegram: e.target.checked })}
                className="rounded"
              />
              <span className="font-medium">Telegram</span>
            </label>
            {orgSettings.show_telegram && (
              <Input
                type="url"
                placeholder="https://t.me/your_channel"
                value={orgSettings.telegram_url || ""}
                onChange={(e) => onChange({ telegram_url: e.target.value })}
              />
            )}
          </div>

          <div className="space-y-2 p-4 rounded-lg border">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={orgSettings.show_whatsapp}
                onChange={(e) => onChange({ show_whatsapp: e.target.checked })}
                className="rounded"
              />
              <span className="font-medium">WhatsApp</span>
            </label>
            {orgSettings.show_whatsapp && (
              <Input
                type="url"
                placeholder="https://wa.me/79001234567"
                value={orgSettings.whatsapp_url || ""}
                onChange={(e) => onChange({ whatsapp_url: e.target.value })}
              />
            )}
          </div>

          <div className="space-y-2 p-4 rounded-lg border">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={orgSettings.show_youtube}
                onChange={(e) => onChange({ show_youtube: e.target.checked })}
                className="rounded"
              />
              <span className="font-medium">YouTube</span>
            </label>
            {orgSettings.show_youtube && (
              <Input
                type="url"
                placeholder="https://youtube.com/@your_channel"
                value={orgSettings.youtube_url || ""}
                onChange={(e) => onChange({ youtube_url: e.target.value })}
              />
            )}
          </div>

          <div className="space-y-2 p-4 rounded-lg border">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={orgSettings.show_instagram}
                onChange={(e) => onChange({ show_instagram: e.target.checked })}
                className="rounded"
              />
              <span className="font-medium">Instagram</span>
            </label>
            {orgSettings.show_instagram && (
              <Input
                type="url"
                placeholder="https://instagram.com/your_account"
                value={orgSettings.instagram_url || ""}
                onChange={(e) => onChange({ instagram_url: e.target.value })}
              />
            )}
          </div>
        </div>

        <Button onClick={() => onSave(orgSettings)} disabled={loadingSettings} className="mt-4">
          {loadingSettings ? "Сохранение..." : "Сохранить социальные сети"}
        </Button>
      </CardContent>
    </Card>
  )
}
