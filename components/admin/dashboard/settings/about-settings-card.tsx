"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { OrganizationSettings } from "@/lib/types"
import { updateOrganizationSettings } from "@/app/actions"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Plus, Trash2 } from "lucide-react"

interface AboutSettingsCardProps {
    settings: OrganizationSettings
}

export function AboutSettingsCard({ settings }: AboutSettingsCardProps) {
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        about_company_title: settings.about_company_title || "",
        about_company_subtitle: settings.about_company_subtitle || "",
        about_company_content: settings.about_company_content || "",
        about_company_stats: Array.isArray(settings.about_company_stats)
            ? settings.about_company_stats
            : [
                { value: "15 лет", label: "безупречной репутации на рынке недвижимости" },
                { value: "500+", label: "закрытых сделок: от уютных дачных наделов до крупных массивов под ИЖС и промышленность" },
                { value: "100%", label: "юридическая чистота: мы не просто продаем участки, мы обеспечиваем безопасность каждой подписи в договоре" },
                { value: "39-й регион", label: "наш дом: мы работаем только в Калининградской области, поэтому знаем все локальные нюансы" },
            ],
        about_company_advantages: Array.isArray(settings.about_company_advantages)
            ? settings.about_company_advantages
            : [
                {
                    title: "Экспертность в локации",
                    description:
                        "Калининградская область имеет свои уникальные особенности. Мы знаем, где можно строить дом мечты, а где земля станет идеальным инвестиционным активом.",
                },
                {
                    title: "Безопасность и прозрачность",
                    description:
                        "Каждый объект в базе «БалтикЗемля» проходит многоступенчатую юридическую проверку. Мы гарантируем отсутствие обременений и скрытых споров.",
                },
                {
                    title: "Полный цикл сопровождения",
                    description:
                        "Мы берем на себя межевание, изменение ВРИ, получение ТУ на свет и газ, и даже дистанционные сделки для клиентов из «большой» России.",
                },
            ],
    })

    // Handlers for Stats
    const addStat = () => {
        setFormData({
            ...formData,
            about_company_stats: [...formData.about_company_stats, { value: "", label: "" }],
        })
    }

    const removeStat = (index: number) => {
        const newStats = [...formData.about_company_stats]
        newStats.splice(index, 1)
        setFormData({ ...formData, about_company_stats: newStats })
    }

    const updateStat = (index: number, field: "value" | "label", value: string) => {
        const newStats = [...formData.about_company_stats]
        newStats[index] = { ...newStats[index], [field]: value }
        setFormData({ ...formData, about_company_stats: newStats })
    }

    // Handlers for Advantages
    const addAdvantage = () => {
        setFormData({
            ...formData,
            about_company_advantages: [...formData.about_company_advantages, { title: "", description: "" }],
        })
    }

    const removeAdvantage = (index: number) => {
        const newAdvs = [...formData.about_company_advantages]
        newAdvs.splice(index, 1)
        setFormData({ ...formData, about_company_advantages: newAdvs })
    }

    const updateAdvantage = (index: number, field: "title" | "description", value: string) => {
        const newAdvs = [...formData.about_company_advantages]
        newAdvs[index] = { ...newAdvs[index], [field]: value }
        setFormData({ ...formData, about_company_advantages: newAdvs })
    }

    const handleSave = async () => {
        setLoading(true)
        try {
            const res = await updateOrganizationSettings({
                about_company_title: formData.about_company_title,
                about_company_subtitle: formData.about_company_subtitle,
                about_company_content: formData.about_company_content,
                about_company_stats: formData.about_company_stats,
                about_company_advantages: formData.about_company_advantages,
            })

            if (res.success) {
                toast({ title: "Настройки сохранены", description: "Данные страницы «О компании» обновлены" })
            } else {
                toast({ title: "Ошибка", description: res.error, variant: "destructive" })
            }
        } catch (error) {
            toast({ title: "Ошибка", description: "Не удалось сохранить настройки", variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Страница «О компании»</CardTitle>
                <CardDescription>Управление контентом страницы /about</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Заголовок</label>
                    <Input
                        value={formData.about_company_title}
                        onChange={(e) => setFormData({ ...formData, about_company_title: e.target.value })}
                        placeholder="О компании «БалтикЗемля»"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Подзаголовок</label>
                    <Textarea
                        value={formData.about_company_subtitle}
                        onChange={(e) => setFormData({ ...formData, about_company_subtitle: e.target.value })}
                        placeholder="Ваш эксперт по земельным активам..."
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Основной текст</label>
                    <Textarea
                        className="min-h-[200px]"
                        value={formData.about_company_content}
                        onChange={(e) => setFormData({ ...formData, about_company_content: e.target.value })}
                        placeholder="Кто мы..."
                    />
                    <p className="text-xs text-muted-foreground">Поддерживает переносы строк</p>
                </div>

                {/* Stats Section */}
                <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold">Наша история в цифрах</h3>
                        <Button variant="outline" size="sm" onClick={addStat}>
                            <Plus className="w-4 h-4 mr-1" /> Добавить
                        </Button>
                    </div>
                    <div className="space-y-3">
                        {formData.about_company_stats.map((stat: any, index: number) => (
                            <div key={index} className="flex gap-2 items-start">
                                <Input
                                    className="w-1/4"
                                    value={stat.value}
                                    onChange={(e) => updateStat(index, "value", e.target.value)}
                                    placeholder="Значение (15 лет)"
                                />
                                <Textarea
                                    className="flex-1 min-h-[40px] h-[40px]"
                                    value={stat.label}
                                    onChange={(e) => updateStat(index, "label", e.target.value)}
                                    placeholder="Описание"
                                />
                                <Button variant="ghost" size="icon" onClick={() => removeStat(index)}>
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Advantages Section */}
                <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold">Почему выбирают нас</h3>
                        <Button variant="outline" size="sm" onClick={addAdvantage}>
                            <Plus className="w-4 h-4 mr-1" /> Добавить
                        </Button>
                    </div>
                    <div className="space-y-4">
                        {formData.about_company_advantages.map((adv: any, index: number) => (
                            <div key={index} className="space-y-2 border p-3 rounded-lg relative">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2"
                                    onClick={() => removeAdvantage(index)}
                                >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                                <Input
                                    value={adv.title}
                                    onChange={(e) => updateAdvantage(index, "title", e.target.value)}
                                    placeholder="Заголовок преимущества"
                                    className="font-medium"
                                />
                                <Textarea
                                    value={adv.description}
                                    onChange={(e) => updateAdvantage(index, "description", e.target.value)}
                                    placeholder="Описание преимущества"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleSave} disabled={loading}>
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Сохранить изменения
                </Button>
            </CardFooter>
        </Card>
    )
}
