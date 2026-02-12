import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { Calendar, ArrowRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Header } from "@/components/calming/header"
import { Footer } from "@/components/calming/footer"
import { SiteBreadcrumb } from "@/components/site-breadcrumb"

export const revalidate = 3600

export const metadata: Metadata = {
    title: "Новости",
    description: "Новости компании БалтикЗемля — актуальные события, обзоры рынка земельных участков и полезные материалы о недвижимости в Калининградской области.",
    alternates: {
        canonical: "https://baltland.ru/news",
    },
    openGraph: {
        title: "Новости",
        description: "Новости компании БалтикЗемля — актуальные события и обзоры рынка земельных участков в Калининградской области.",
        url: "https://baltland.ru/news",
        type: "website",
        images: [{ url: "https://baltland.ru/og-image.png", width: 1200, height: 630 }],
    },
}

export default async function NewsListPage() {
    const supabase = await createClient()

    const { data: news } = await supabase
        .from("news")
        .select("*")
        .eq("is_published", true)
        .order("published_at", { ascending: false })

    const items = news || []

    return (
        <main className="min-h-screen bg-background">
            <Header />

            <div className="sticky top-[4.5rem] z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
                <SiteBreadcrumb
                    items={[{ label: "Новости", href: "/news" }]}
                    className="container mx-auto px-4 py-3"
                />
            </div>

            <section className="container mx-auto px-4 py-12">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">Новости</h1>
                <p className="text-muted-foreground mb-10 max-w-2xl">
                    Актуальные события, обзоры рынка земельных участков и полезные материалы о недвижимости в Калининградской области.
                </p>

                {items.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground">
                        <p className="text-lg">Новостей пока нет</p>
                    </div>
                ) : (
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                        {items.map((item) => (
                            <article
                                key={item.id}
                                className="group rounded-3xl bg-card border border-border/50 overflow-hidden hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-1"
                            >
                                {item.image_url && (
                                    <Link href={`/news/${item.id}`} className="block relative h-56 bg-white overflow-hidden">
                                        <Image
                                            src={item.image_url}
                                            alt={item.title}
                                            fill
                                            loading="lazy"
                                            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                            className="object-cover group-hover:scale-105 transition-transform duration-700"
                                        />
                                    </Link>
                                )}

                                <div className="p-6">
                                    {item.published_at && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                                            <Calendar className="h-4 w-4" />
                                            {new Date(item.published_at).toLocaleDateString("ru-RU", {
                                                day: "numeric",
                                                month: "long",
                                                year: "numeric",
                                            })}
                                        </div>
                                    )}

                                    <Link href={`/news/${item.id}`}>
                                        <h2 className="text-xl font-semibold mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                                            {item.title}
                                        </h2>
                                    </Link>

                                    <p className="text-muted-foreground leading-relaxed line-clamp-3 mb-4">
                                        {item.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()}
                                    </p>

                                    <Link
                                        href={`/news/${item.id}`}
                                        className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
                                    >
                                        Подробнее
                                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <Footer />
        </main>
    )
}
