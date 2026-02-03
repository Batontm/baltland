import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { OrganizationSettings } from "@/lib/types"

interface ProposalFieldsCardProps {
  orgSettings: OrganizationSettings
  loadingSettings: boolean
  onChange: (patch: Partial<OrganizationSettings>) => void
  onSave: (data: Partial<OrganizationSettings>) => void
}

export function ProposalFieldsCard({ orgSettings, loadingSettings, onChange, onSave }: ProposalFieldsCardProps) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Отображение полей в коммерческом предложении</CardTitle>
        <CardDescription>Выберите, какие поля показывать для каждого участка</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={orgSettings.show_image} onChange={(e) => onChange({ show_image: e.target.checked })} className="rounded" />
            <span className="text-sm">Изображение участка</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={orgSettings.show_price} onChange={(e) => onChange({ show_price: e.target.checked })} className="rounded" />
            <span className="text-sm">Цена</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={orgSettings.show_area} onChange={(e) => onChange({ show_area: e.target.checked })} className="rounded" />
            <span className="text-sm">Площадь</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={orgSettings.show_district} onChange={(e) => onChange({ show_district: e.target.checked })} className="rounded" />
            <span className="text-sm">Район</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={orgSettings.show_location}
              onChange={(e) => onChange({ show_location: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Местоположение</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={orgSettings.show_status} onChange={(e) => onChange({ show_status: e.target.checked })} className="rounded" />
            <span className="text-sm">Статус земли</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={orgSettings.show_cadastral_number}
              onChange={(e) => onChange({ show_cadastral_number: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Кадастровый номер</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={orgSettings.show_distance_to_sea}
              onChange={(e) => onChange({ show_distance_to_sea: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Расстояние до моря</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={orgSettings.show_amenities}
              onChange={(e) => onChange({ show_amenities: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Коммуникации</span>
          </label>
        </div>
        <Button onClick={() => onSave(orgSettings)} disabled={loadingSettings} className="mt-4">
          {loadingSettings ? "Сохранение..." : "Сохранить настройки отображения"}
        </Button>
      </CardContent>
    </Card>
  )
}
