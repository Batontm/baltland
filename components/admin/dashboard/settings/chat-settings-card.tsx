"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MessageCircle, Save, Loader2, Plus, X, User, Image, Bot } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { OrganizationSettings } from "@/lib/types"

interface ChatSettingsCardProps {
    orgSettings: OrganizationSettings
    loadingSettings: boolean
    onChange: (patch: Partial<OrganizationSettings>) => void
    onSave: (data: Partial<OrganizationSettings>) => void
}

export function ChatSettingsCard({ orgSettings, loadingSettings, onChange, onSave }: ChatSettingsCardProps) {
    const [newQuestion, setNewQuestion] = useState("")

    const quickQuestions = orgSettings.chat_quick_questions || []

    const addQuestion = () => {
        if (newQuestion.trim()) {
            onChange({ chat_quick_questions: [...quickQuestions, newQuestion.trim()] })
            setNewQuestion("")
        }
    }

    const removeQuestion = (index: number) => {
        onChange({ chat_quick_questions: quickQuestions.filter((_, i) => i !== index) })
    }

    return (
        <Card className="rounded-2xl overflow-hidden border-emerald-100 shadow-sm">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <MessageCircle className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-xl">Онлайн-чат</CardTitle>
                        <CardDescription>Управление виджетом чата на сайте</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                {/* Enable/Disable Toggle */}
                <div className="flex items-center justify-between p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                    <div className="space-y-0.5">
                        <Label className="text-base font-semibold text-slate-900">Включить виджет</Label>
                        <p className="text-sm text-slate-500">Показывать кнопку чата на всех страницах сайта</p>
                    </div>
                    <Switch
                        checked={orgSettings.chat_widget_enabled}
                        onCheckedChange={(checked) => onChange({ chat_widget_enabled: checked })}
                    />
                </div>

                {/* Bot Selection */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Bot className="h-4 w-4" />
                        Бот для чата
                    </h3>
                    <div className="space-y-2">
                        <Label htmlFor="chat_bot_select">Выберите бота для отправки сообщений</Label>
                        <Select
                            value={orgSettings.chat_telegram_bot_id || (orgSettings.telegram_bots && orgSettings.telegram_bots.length > 0 ? orgSettings.telegram_bots[0].id : "")}
                            onValueChange={(value) => onChange({ chat_telegram_bot_id: value })}
                        >
                            <SelectTrigger id="chat_bot_select" className="border-slate-200 focus:ring-emerald-500">
                                <SelectValue placeholder="Выберите бота" />
                            </SelectTrigger>
                            <SelectContent>
                                {orgSettings.telegram_bots?.map((bot) => (
                                    <SelectItem key={bot.id} value={bot.id}>
                                        {bot.name} (@{bot.token.split(':')[0]}...)
                                    </SelectItem>
                                ))}
                                {!orgSettings.telegram_bots?.length && (
                                    <SelectItem value="no_bots" disabled>
                                        Нет настроенных ботов
                                    </SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500">
                            Через этого бота будут приходить сообщения с сайта, и от его имени будут отправляться ответы.
                        </p>
                    </div>
                </div>

                {/* Consultant Settings */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Консультант
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="chat_consultant_name">Имя консультанта</Label>
                            <Input
                                id="chat_consultant_name"
                                placeholder="Анна"
                                value={orgSettings.chat_consultant_name || ""}
                                onChange={(e) => onChange({ chat_consultant_name: e.target.value })}
                                className="border-slate-200 focus:ring-emerald-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="chat_consultant_avatar_url">URL аватара</Label>
                            <Input
                                id="chat_consultant_avatar_url"
                                placeholder="https://example.com/avatar.jpg"
                                value={orgSettings.chat_consultant_avatar_url || ""}
                                onChange={(e) => onChange({ chat_consultant_avatar_url: e.target.value })}
                                className="border-slate-200 focus:ring-emerald-500"
                            />
                            <p className="text-xs text-slate-400">Рекомендуемый размер: 100x100px</p>
                        </div>
                    </div>
                    {orgSettings.chat_consultant_avatar_url && (
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                            <img
                                src={orgSettings.chat_consultant_avatar_url}
                                alt="Avatar preview"
                                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow"
                                onError={(e) => (e.currentTarget.style.display = "none")}
                            />
                            <span className="text-sm text-slate-600">
                                {orgSettings.chat_consultant_name || "Консультант"}
                            </span>
                        </div>
                    )}
                </div>

                {/* Messages */}
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="chat_welcome_message">Приветственное сообщение</Label>
                        <Textarea
                            id="chat_welcome_message"
                            placeholder="Здравствуйте! Я могу вам чем-то помочь?"
                            value={orgSettings.chat_welcome_message || ""}
                            onChange={(e) => onChange({ chat_welcome_message: e.target.value })}
                            className="resize-none min-h-[100px] border-slate-200 focus:ring-emerald-500"
                        />
                        <p className="text-xs text-slate-400 italic">Появится в окне чата у нового пользователя</p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="chat_prompt_placeholder">Текст в поле ввода</Label>
                            <Input
                                id="chat_prompt_placeholder"
                                placeholder="Введите сообщение"
                                value={orgSettings.chat_prompt_placeholder || ""}
                                onChange={(e) => onChange({ chat_prompt_placeholder: e.target.value })}
                                className="border-slate-200 focus:ring-emerald-500"
                            />
                        </div>

                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                            <p className="text-xs text-amber-800 leading-relaxed font-medium">
                                ⚠️ Важно: Для ответов пользователям используйте функцию "Ответить" (Reply) на сообщения бота в Telegram.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Quick Questions */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <MessageCircle className="h-4 w-4" />
                        Быстрые вопросы
                    </h3>
                    <p className="text-xs text-slate-500">
                        Кнопки с готовыми вопросами, которые пользователь может нажать для быстрого начала диалога
                    </p>

                    {/* Existing Questions */}
                    <div className="space-y-2">
                        {quickQuestions.map((question, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 group"
                            >
                                <span className="flex-1 text-sm text-slate-700">{question}</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => removeQuestion(index)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    {/* Add New Question */}
                    <div className="flex gap-2">
                        <Input
                            placeholder="Новый быстрый вопрос..."
                            value={newQuestion}
                            onChange={(e) => setNewQuestion(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addQuestion())}
                            className="flex-1 border-slate-200 focus:ring-emerald-500"
                        />
                        <Button
                            type="button"
                            onClick={addQuestion}
                            disabled={!newQuestion.trim()}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Добавить
                        </Button>
                    </div>
                </div>

                {/* Save Button */}
                <div className="pt-2 flex justify-end">
                    <Button
                        onClick={() => onSave(orgSettings)}
                        disabled={loadingSettings}
                        className="bg-emerald-600 hover:bg-emerald-700 h-11 px-8 rounded-xl shadow-lg shadow-emerald-200 transition-all font-semibold"
                    >
                        {loadingSettings ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        Сохранить настройки чата
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
