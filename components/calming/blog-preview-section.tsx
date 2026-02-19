import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Calendar, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Article {
    id: string
    title: string
    slug: string | null
    meta_description: string | null
    content: string
    image_url: string | null
    published_at: string | null
}

export function BlogPreviewSection({ articles }: { articles: Article[] }) {
    if (!articles || articles.length === 0) return null

    return (
        <section className="py-20 bg-secondary/20">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <BookOpen className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold">Полезные статьи</h2>
                            <p className="text-muted-foreground text-sm mt-0.5">
                                Всё о покупке участка в Калининградской области
                            </p>
                        </div>
                    </div>
                    <Link href="/blog" className="hidden sm:block">
                        <Button variant="outline" className="rounded-xl">
                            Все статьи
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {articles.map((item) => (
                        <Link
                            key={item.id}
                            href={`/blog/${item.slug || item.id}`}
                            className="group rounded-2xl border border-border/50 overflow-hidden bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                        >
                            {item.image_url && (
                                <div className="relative h-40 bg-secondary/10 overflow-hidden">
                                    <Image
                                        src={item.image_url}
                                        alt={item.title}
                                        fill
                                        loading="lazy"
                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                </div>
                            )}
                            <div className="p-5">
                                {item.published_at && (
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                                        <Calendar className="h-3 w-3" />
                                        {new Date(item.published_at).toLocaleDateString("ru-RU", {
                                            day: "numeric",
                                            month: "long",
                                            year: "numeric",
                                        })}
                                    </div>
                                )}
                                <h3 className="font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                                    {item.title}
                                </h3>
                                <span className="inline-flex items-center gap-1 text-sm text-primary font-medium mt-3">
                                    Читать
                                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>

                <div className="mt-8 text-center sm:hidden">
                    <Link href="/blog">
                        <Button variant="outline" className="rounded-xl">
                            Все статьи
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </div>
            </div>
        </section>
    )
}
