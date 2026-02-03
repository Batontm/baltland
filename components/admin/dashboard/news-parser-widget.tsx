'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Rss, Search, Loader2, X, Plus, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react'
import { parseNewsActionWithFeeds } from '@/app/actions/parser'
import type { ParseResult } from '@/lib/news-parser-types'
import { DEFAULT_RSS_FEEDS } from '@/lib/rss-feeds'

// Предустановленные ключевые слова
const PRESET_KEYWORDS = [
    'Калининград',
    'ипотека',
    'земельный участок',
    'ИЖС',
    'недвижимость',
    'застройщик',
    'строительство',
]

export function NewsParserWidget({ onNewsDraftsAdded }: { onNewsDraftsAdded?: () => void }) {
    const [keywords, setKeywords] = useState<string[]>(['Калининград', 'земельный участок'])
    const [inputValue, setInputValue] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<ParseResult | null>(null)
    const [showResults, setShowResults] = useState(false)
    const [selectedFeedIds, setSelectedFeedIds] = useState<string[]>(DEFAULT_RSS_FEEDS.map(f => f.id))

    const addKeyword = (keyword: string) => {
        const trimmed = keyword.trim()
        if (trimmed && !keywords.includes(trimmed)) {
            setKeywords([...keywords, trimmed])
        }
        setInputValue('')
    }

    const removeKeyword = (keyword: string) => {
        setKeywords(keywords.filter(k => k !== keyword))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (inputValue.trim()) {
            addKeyword(inputValue)
        }
    }

    const handleParse = async () => {
        if (keywords.length === 0) {
            alert('Добавьте хотя бы одно ключевое слово')
            return
        }

        if (selectedFeedIds.length === 0) {
            alert('Выберите хотя бы один источник')
            return
        }

        setLoading(true)
        setResult(null)
        setShowResults(false)

        try {
            const parseResult = await parseNewsActionWithFeeds(keywords, selectedFeedIds)
            setResult(parseResult)
            setShowResults(true)

            if (parseResult.added > 0 && onNewsDraftsAdded) {
                onNewsDraftsAdded()
            }
        } catch (error) {
            setResult({
                success: false,
                added: 0,
                skipped: 0,
                errors: ['Не удалось выполнить парсинг'],
                items: []
            })
            setShowResults(true)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="rounded-2xl">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-orange-500/10">
                        <Rss className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                        <CardTitle>Парсер новостей</CardTitle>
                        <CardDescription>Поиск новостей по ключевым словам из RSS-лент</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Источники */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Источники</label>
                    <div className="flex flex-wrap gap-2">
                        {DEFAULT_RSS_FEEDS.map((feed) => {
                            const selected = selectedFeedIds.includes(feed.id)
                            return (
                                <Badge
                                    key={feed.id}
                                    variant={selected ? 'secondary' : 'outline'}
                                    className="cursor-pointer select-none"
                                    onClick={() => {
                                        setSelectedFeedIds((prev) => {
                                            if (prev.includes(feed.id)) return prev.filter((id) => id !== feed.id)
                                            return [...prev, feed.id]
                                        })
                                    }}
                                >
                                    {feed.name}
                                </Badge>
                            )
                        })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Нажми на источник, чтобы включить/выключить.
                    </p>
                </div>

                {/* Ключевые слова */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Ключевые слова</label>
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <Input
                            placeholder="Добавить ключевое слово..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className="flex-1"
                        />
                        <Button type="submit" variant="outline" size="icon">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </form>

                    {/* Активные ключевые слова */}
                    <div className="flex flex-wrap gap-2">
                        {keywords.map((keyword) => (
                            <Badge
                                key={keyword}
                                variant="secondary"
                                className="pl-3 pr-1 py-1 flex items-center gap-1"
                            >
                                {keyword}
                                <button
                                    onClick={() => removeKeyword(keyword)}
                                    className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>

                    {/* Предустановленные слова */}
                    <div className="flex flex-wrap gap-1 pt-2">
                        <span className="text-xs text-muted-foreground mr-2">Добавить:</span>
                        {PRESET_KEYWORDS.filter(k => !keywords.includes(k)).slice(0, 5).map((keyword) => (
                            <Badge
                                key={keyword}
                                variant="outline"
                                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
                                onClick={() => addKeyword(keyword)}
                            >
                                + {keyword}
                            </Badge>
                        ))}
                    </div>
                </div>

                {/* Кнопка запуска */}
                <Button
                    onClick={handleParse}
                    disabled={loading || keywords.length === 0}
                    className="w-full gap-2"
                >
                    {loading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Поиск новостей...
                        </>
                    ) : (
                        <>
                            <Search className="h-4 w-4" />
                            Найти новости
                        </>
                    )}
                </Button>

                {/* Результаты */}
                {showResults && result && (
                    <div className="space-y-3 pt-2">
                        {result.added > 0 ? (
                            <Alert className="bg-green-50 border-green-200">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-700">
                                    Найдено и добавлено <strong>{result.added}</strong> новых черновиков
                                    {result.skipped > 0 && ` (пропущено ${result.skipped} дублей)`}
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <Alert className="bg-amber-50 border-amber-200">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                <AlertDescription className="text-amber-700">
                                    Новых новостей не найдено
                                    {result.skipped > 0 && ` (${result.skipped} уже существует)`}
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Список ошибок */}
                        {result.errors.length > 0 && (
                            <div className="text-xs text-muted-foreground space-y-1">
                                <p className="font-medium">Предупреждения:</p>
                                {result.errors.slice(0, 3).map((error, i) => (
                                    <p key={i}>• {error}</p>
                                ))}
                                {result.errors.length > 3 && (
                                    <p>...и ещё {result.errors.length - 3}</p>
                                )}
                            </div>
                        )}

                        {/* Превью найденных новостей */}
                        {result.items.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Добавленные черновики:</p>
                                <div className="max-h-48 overflow-y-auto space-y-2">
                                    {result.items.slice(0, 5).map((item, i) => (
                                        <div key={i} className="p-2 rounded-lg bg-muted/50 text-sm">
                                            <p className="font-medium line-clamp-1">{item.title}</p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                                <span>{item.source}</span>
                                                {item.link && (
                                                    <a
                                                        href={item.link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-500 hover:underline flex items-center gap-0.5"
                                                    >
                                                        Источник <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {result.items.length > 5 && (
                                        <p className="text-xs text-muted-foreground text-center">
                                            ...и ещё {result.items.length - 5} новостей
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Инфо о источниках */}
                <p className="text-xs text-muted-foreground">
                    Источники: {DEFAULT_RSS_FEEDS.map((f) => f.name).join(', ')}
                </p>
            </CardContent>
        </Card>
    )
}
