import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Calendar } from "lucide-react"

interface Article {
    id: string
    title: string
    slug: string | null
    meta_description: string | null
    content: string
    image_url: string | null
    published_at: string | null
}

export function RelatedArticles({ articles }: { articles: Article[] }) {
    if (!articles || articles.length === 0) return null

    return (
        <section className="mt-16 pt-12 border-t border-border/50">
            <h2 className="text-2xl font-serif font-medium mb-8">Читайте также</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {articles.map((item) => (
                    <Link
                        key={item.id}
                        href={`/blog/${item.slug || item.id}`}
                        className="group rounded-2xl border border-border/50 overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 bg-card"
                    >
                        {item.image_url && (
                            <div className="relative h-40 bg-secondary/10 overflow-hidden">
                                <Image
                                    src={item.image_url}
                                    alt={item.title}
                                    fill
                                    loading="lazy"
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
                            <h3 className="font-semibold leading-snug mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                                {item.title}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                                {item.meta_description ||
                                    item.content
                                        .replace(/<[^>]*>/g, " ")
                                        .replace(/\s+/g, " ")
                                        .trim()
                                        .substring(0, 120)}
                            </p>
                            <span className="inline-flex items-center gap-1 text-sm text-primary font-medium mt-3">
                                Читать
                                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    )
}
