import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { OrganizationSettings } from "@/lib/types"
import { Edit, MoveDown, MoveUp, Plus, Trash2, X } from "lucide-react"

interface HomeNewBlockCardProps {
  orgSettings: OrganizationSettings
  loadingSettings: boolean
  onSave: (data: Partial<OrganizationSettings>) => void
}

type PDConfig = {
  title: string
  subtitle: string
  cta_label: string
  initial_participant_count: number
  budget_options: string[]
  distance_options: string[]
  amenities_options: string[]
}

type RoiInvestmentType = { name: string; growthRate: number }
type RoiConfig = {
  title: string
  subtitle: string
  min_price: number
  max_price: number
  step: number
  initial_price: number
  years_options: number[]
  investment_types: RoiInvestmentType[]
}

type HomeFaqItem = { icon: string; question: string; answer: string }
type HomeFaqConfig = { title: string; subtitle: string; items: HomeFaqItem[] }

const DEFAULT_PD: PDConfig = {
  title: "🎯 Подберу участок",
  subtitle: "Ответьте на 3 вопроса",
  cta_label: "Показать",
  initial_participant_count: 47,
  budget_options: ["До 500K", "500K-1M", "1M-2M", ">2M"],
  distance_options: ["<15км", "15-25км", "25-40км", "40+км"],
  amenities_options: ["Свет", "Газ", "Вода", "Лес рядом"],
}

const DEFAULT_ROI: RoiConfig = {
  title: "Калькулятор ROI",
  subtitle: "Рассчитайте прибыль",
  min_price: 500000,
  max_price: 3000000,
  step: 100000,
  initial_price: 950000,
  years_options: [2, 3, 5, 10],
  investment_types: [
    { name: "Под строительство", growthRate: 0.2 },
    { name: "Инвестиционный", growthRate: 0.15 },
  ],
}

const DEFAULT_FAQ: HomeFaqConfig = {
  title: "Частые вопросы",
  subtitle: "Ответы на главное",
  items: [
    { icon: "💳", question: "Можно ли в рассрочку?", answer: "Да, по некоторым участкам доступна рассрочка. Уточните у менеджера." },
    { icon: "⚡", question: "Есть ли коммуникации?", answer: "Зависит от участка. В карточке участка указаны коммуникации: свет, газ, вода." },
    { icon: "📄", question: "Какая категория земли?", answer: "В карточке участка указан статус/категория. При необходимости предоставим выписку." },
  ],
}

function toNum(v: unknown, fallback: number) {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

function toStrArr(v: unknown, fallback: string[]) {
  if (!Array.isArray(v)) return fallback
  const out = v.map((x) => String(x ?? "").trim()).filter(Boolean)
  return out.length > 0 ? out : fallback
}

function toNumArr(v: unknown, fallback: number[]) {
  if (!Array.isArray(v)) return fallback
  const out = v.map((x) => toNum(x, NaN)).filter((x) => Number.isFinite(x))
  return out.length > 0 ? out : fallback
}

function normalizePd(raw: unknown): PDConfig {
  const r = (raw ?? {}) as any
  return {
    title: String(r.title ?? DEFAULT_PD.title),
    subtitle: String(r.subtitle ?? DEFAULT_PD.subtitle),
    cta_label: String(r.cta_label ?? DEFAULT_PD.cta_label),
    initial_participant_count: toNum(r.initial_participant_count, DEFAULT_PD.initial_participant_count),
    budget_options: toStrArr(r.budget_options, DEFAULT_PD.budget_options),
    distance_options: toStrArr(r.distance_options, DEFAULT_PD.distance_options),
    amenities_options: toStrArr(r.amenities_options, DEFAULT_PD.amenities_options),
  }
}

function normalizeRoi(raw: unknown): RoiConfig {
  const r = (raw ?? {}) as any
  const invRaw = Array.isArray(r.investment_types) ? r.investment_types : []
  const investment_types: RoiInvestmentType[] = (invRaw as any[])
    .map((it) => ({ name: String(it?.name ?? "").trim(), growthRate: toNum(it?.growthRate, NaN) }))
    .filter((it) => it.name)

  return {
    title: String(r.title ?? DEFAULT_ROI.title),
    subtitle: String(r.subtitle ?? DEFAULT_ROI.subtitle),
    min_price: toNum(r.min_price, DEFAULT_ROI.min_price),
    max_price: toNum(r.max_price, DEFAULT_ROI.max_price),
    step: toNum(r.step, DEFAULT_ROI.step),
    initial_price: toNum(r.initial_price, DEFAULT_ROI.initial_price),
    years_options: toNumArr(r.years_options, DEFAULT_ROI.years_options),
    investment_types: investment_types.length > 0 ? investment_types : DEFAULT_ROI.investment_types,
  }
}

function normalizeFaq(raw: unknown): HomeFaqConfig {
  const r = (raw ?? {}) as any
  const itemsRaw = Array.isArray(r.items) ? r.items : []
  const items: HomeFaqItem[] = (itemsRaw as any[])
    .map((it) => ({
      icon: String(it?.icon ?? "").trim(),
      question: String(it?.question ?? "").trim(),
      answer: String(it?.answer ?? "").trim(),
    }))
    .filter((it) => it.question && it.answer)

  return {
    title: String(r.title ?? DEFAULT_FAQ.title),
    subtitle: String(r.subtitle ?? DEFAULT_FAQ.subtitle),
    items: items.length > 0 ? items : DEFAULT_FAQ.items,
  }
}

function moveInArray<T>(arr: T[], index: number, direction: "up" | "down") {
  const next = arr.slice()
  const target = direction === "up" ? index - 1 : index + 1
  if (target < 0 || target >= next.length) return next
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item)
  return next
}

export function HomeNewBlockCard({ orgSettings, loadingSettings, onSave }: HomeNewBlockCardProps) {
  const initialPd = useMemo(() => normalizePd((orgSettings as any).home_block_progressive_disclosure), [orgSettings])
  const initialRoi = useMemo(() => normalizeRoi((orgSettings as any).home_block_roi_calculator), [orgSettings])
  const initialFaq = useMemo(() => normalizeFaq((orgSettings as any).home_block_faq), [orgSettings])

  const [pd, setPd] = useState<PDConfig>(initialPd)
  const [roi, setRoi] = useState<RoiConfig>(initialRoi)
  const [faq, setFaq] = useState<HomeFaqConfig>(initialFaq)

  const [editingFaqIndex, setEditingFaqIndex] = useState<number | null>(null)
  const [faqDraft, setFaqDraft] = useState<HomeFaqItem>({ icon: "", question: "", answer: "" })

  useEffect(() => {
    setPd(initialPd)
    setRoi(initialRoi)
    setFaq(initialFaq)
    setEditingFaqIndex(null)
  }, [initialPd, initialRoi, initialFaq])

  const saveAll = () => {
    onSave({
      home_block_progressive_disclosure: pd,
      home_block_roi_calculator: roi,
      home_block_faq: faq,
    } as any)
  }

  const startNewFaq = () => {
    setEditingFaqIndex(-1)
    setFaqDraft({ icon: "", question: "", answer: "" })
  }

  const startEditFaq = (idx: number) => {
    setEditingFaqIndex(idx)
    setFaqDraft(faq.items[idx] || { icon: "", question: "", answer: "" })
  }

  const cancelFaq = () => {
    setEditingFaqIndex(null)
    setFaqDraft({ icon: "", question: "", answer: "" })
  }

  const saveFaq = () => {
    const question = faqDraft.question.trim()
    const answer = faqDraft.answer.trim()
    const icon = faqDraft.icon.trim()
    if (!question || !answer) return

    setFaq((prev) => {
      if (editingFaqIndex === null) return prev
      if (editingFaqIndex === -1) return { ...prev, items: [...prev.items, { icon, question, answer }] }
      const next = prev.items.slice()
      next[editingFaqIndex] = { icon, question, answer }
      return { ...prev, items: next }
    })
    setEditingFaqIndex(null)
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Новый блок главной</CardTitle>
          <CardDescription>Настройка через поля. JSON вручную больше не нужен.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={saveAll} disabled={loadingSettings} className="rounded-xl">
            {loadingSettings ? "Сохранение..." : "Сохранить изменения"}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Подбор участка</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Заголовок</Label>
              <Input value={pd.title} onChange={(e) => setPd((p) => ({ ...p, title: e.target.value }))} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Подзаголовок</Label>
              <Input value={pd.subtitle} onChange={(e) => setPd((p) => ({ ...p, subtitle: e.target.value }))} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Текст кнопки</Label>
              <Input value={pd.cta_label} onChange={(e) => setPd((p) => ({ ...p, cta_label: e.target.value }))} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Счётчик (по умолчанию)</Label>
              <Input
                type="number"
                value={String(pd.initial_participant_count)}
                onChange={(e) => setPd((p) => ({ ...p, initial_participant_count: toNum(e.target.value, p.initial_participant_count) }))}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Бюджет</Label>
              <div className="space-y-2">
                {pd.budget_options.map((v, idx) => (
                  <div key={`b-${idx}`} className="flex items-center gap-2">
                    <Input
                      value={v}
                      onChange={(e) =>
                        setPd((p) => {
                          const next = p.budget_options.slice()
                          next[idx] = e.target.value
                          return { ...p, budget_options: next }
                        })
                      }
                      className="rounded-xl"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="rounded-xl"
                      onClick={() => setPd((p) => ({ ...p, budget_options: p.budget_options.filter((_, i) => i !== idx) }))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setPd((p) => ({ ...p, budget_options: [...p.budget_options, ""] }))}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Расстояние</Label>
              <div className="space-y-2">
                {pd.distance_options.map((v, idx) => (
                  <div key={`d-${idx}`} className="flex items-center gap-2">
                    <Input
                      value={v}
                      onChange={(e) =>
                        setPd((p) => {
                          const next = p.distance_options.slice()
                          next[idx] = e.target.value
                          return { ...p, distance_options: next }
                        })
                      }
                      className="rounded-xl"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="rounded-xl"
                      onClick={() => setPd((p) => ({ ...p, distance_options: p.distance_options.filter((_, i) => i !== idx) }))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setPd((p) => ({ ...p, distance_options: [...p.distance_options, ""] }))}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Что важно</Label>
              <div className="space-y-2">
                {pd.amenities_options.map((v, idx) => (
                  <div key={`a-${idx}`} className="flex items-center gap-2">
                    <Input
                      value={v}
                      onChange={(e) =>
                        setPd((p) => {
                          const next = p.amenities_options.slice()
                          next[idx] = e.target.value
                          return { ...p, amenities_options: next }
                        })
                      }
                      className="rounded-xl"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="rounded-xl"
                      onClick={() => setPd((p) => ({ ...p, amenities_options: p.amenities_options.filter((_, i) => i !== idx) }))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setPd((p) => ({ ...p, amenities_options: [...p.amenities_options, ""] }))}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Калькулятор ROI</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Заголовок</Label>
              <Input value={roi.title} onChange={(e) => setRoi((p) => ({ ...p, title: e.target.value }))} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Подзаголовок</Label>
              <Input value={roi.subtitle} onChange={(e) => setRoi((p) => ({ ...p, subtitle: e.target.value }))} className="rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Мин. цена</Label>
              <Input
                type="number"
                value={String(roi.min_price)}
                onChange={(e) => setRoi((p) => ({ ...p, min_price: toNum(e.target.value, p.min_price) }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Макс. цена</Label>
              <Input
                type="number"
                value={String(roi.max_price)}
                onChange={(e) => setRoi((p) => ({ ...p, max_price: toNum(e.target.value, p.max_price) }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Шаг</Label>
              <Input
                type="number"
                value={String(roi.step)}
                onChange={(e) => setRoi((p) => ({ ...p, step: toNum(e.target.value, p.step) }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Цена по умолчанию</Label>
              <Input
                type="number"
                value={String(roi.initial_price)}
                onChange={(e) => setRoi((p) => ({ ...p, initial_price: toNum(e.target.value, p.initial_price) }))}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Срок владения (годы)</Label>
            <div className="space-y-2">
              {roi.years_options.map((y, idx) => (
                <div key={`y-${idx}`} className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={String(y)}
                    onChange={(e) =>
                      setRoi((p) => {
                        const next = p.years_options.slice()
                        next[idx] = toNum(e.target.value, next[idx])
                        return { ...p, years_options: next }
                      })
                    }
                    className="rounded-xl"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="rounded-xl"
                    onClick={() => setRoi((p) => ({ ...p, years_options: p.years_options.filter((_, i) => i !== idx) }))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setRoi((p) => ({ ...p, years_options: [...p.years_options, 3] }))}
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Тип участка</Label>
            <div className="space-y-2">
              {roi.investment_types.map((it, idx) => (
                <div key={`t-${idx}`} className="grid grid-cols-1 md:grid-cols-[1fr_140px_auto_auto_auto] gap-2 items-center">
                  <Input
                    value={it.name}
                    onChange={(e) =>
                      setRoi((p) => {
                        const next = p.investment_types.slice()
                        next[idx] = { ...next[idx], name: e.target.value }
                        return { ...p, investment_types: next }
                      })
                    }
                    className="rounded-xl"
                    placeholder="Название"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={String(it.growthRate)}
                    onChange={(e) =>
                      setRoi((p) => {
                        const next = p.investment_types.slice()
                        next[idx] = { ...next[idx], growthRate: toNum(e.target.value, next[idx].growthRate) }
                        return { ...p, investment_types: next }
                      })
                    }
                    className="rounded-xl"
                    placeholder="0.15"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="rounded-xl"
                    disabled={idx === 0}
                    onClick={() => setRoi((p) => ({ ...p, investment_types: moveInArray(p.investment_types, idx, "up") }))}
                  >
                    <MoveUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="rounded-xl"
                    disabled={idx === roi.investment_types.length - 1}
                    onClick={() => setRoi((p) => ({ ...p, investment_types: moveInArray(p.investment_types, idx, "down") }))}
                  >
                    <MoveDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="rounded-xl"
                    onClick={() => setRoi((p) => ({ ...p, investment_types: p.investment_types.filter((_, i) => i !== idx) }))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setRoi((p) => ({ ...p, investment_types: [...p.investment_types, { name: "", growthRate: 0.1 }] }))}
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить тип
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">FAQ (главная)</CardTitle>
            <Button type="button" onClick={startNewFaq} className="rounded-xl">
              <Plus className="h-4 w-4 mr-2" />
              Добавить вопрос
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Заголовок</Label>
              <Input value={faq.title} onChange={(e) => setFaq((p) => ({ ...p, title: e.target.value }))} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Подзаголовок</Label>
              <Input value={faq.subtitle} onChange={(e) => setFaq((p) => ({ ...p, subtitle: e.target.value }))} className="rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {editingFaqIndex !== null && (
              <Card className="lg:col-span-1 rounded-2xl h-fit sticky top-24">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{editingFaqIndex === -1 ? "Новый вопрос" : "Редактирование"}</CardTitle>
                    <Button type="button" variant="ghost" size="icon" onClick={cancelFaq}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Иконка (эмодзи)</Label>
                    <Input value={faqDraft.icon} onChange={(e) => setFaqDraft((p) => ({ ...p, icon: e.target.value }))} className="rounded-xl" placeholder="💳" />
                  </div>
                  <div className="space-y-2">
                    <Label>Вопрос</Label>
                    <Input value={faqDraft.question} onChange={(e) => setFaqDraft((p) => ({ ...p, question: e.target.value }))} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Ответ</Label>
                    <Textarea value={faqDraft.answer} onChange={(e) => setFaqDraft((p) => ({ ...p, answer: e.target.value }))} className="rounded-xl min-h-[120px]" />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button type="button" onClick={saveFaq} disabled={loadingSettings} className="flex-1 rounded-xl">
                      Сохранить
                    </Button>
                    <Button type="button" variant="outline" onClick={cancelFaq} className="rounded-xl bg-transparent">
                      Отмена
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className={`${editingFaqIndex !== null ? "lg:col-span-2" : "lg:col-span-3"} space-y-3`}>
              {faq.items.map((item, idx) => (
                <Card key={`${item.question}-${idx}`} className="rounded-2xl">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="text-sm font-semibold">
                          {item.icon ? `${item.icon} ` : ""}
                          {item.question}
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-2">{item.answer}</div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex gap-1">
                          <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => startEditFaq(idx)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setFaq((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg"
                            disabled={idx === 0}
                            onClick={() => setFaq((p) => ({ ...p, items: moveInArray(p.items, idx, "up") }))}
                          >
                            <MoveUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg"
                            disabled={idx === faq.items.length - 1}
                            onClick={() => setFaq((p) => ({ ...p, items: moveInArray(p.items, idx, "down") }))}
                          >
                            <MoveDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {faq.items.length === 0 ? (
                <Card className="rounded-2xl border-dashed">
                  <CardContent className="py-10 text-center text-muted-foreground">Вопросов пока нет</CardContent>
                </Card>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
