import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { Calendar, ArrowRight, BookOpen } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Header } from "@/components/calming/header"
import { Footer } from "@/components/calming/footer"
import { SiteBreadcrumb } from "@/components/site-breadcrumb"

export const revalidate = 3600

export const metadata: Metadata = {
    title: "Полезные статьи — БалтикЗемля",
    description:
        "Полезные статьи о покупке земельных участков в Калининградской области: оформление, документы, коммуникации, разрешение на строительство и другие важные вопросы.",
    alternates: {
        canonical: "https://baltland.ru/blog",
    },
    openGraph: {
        title: "Полезные статьи — БалтикЗемля",
        description:
            "Полезные статьи о покупке земельных участков в Калининградской области.",
        url: "https://baltland.ru/blog",
        type: "website",
        images: [
            { url: "https://baltland.ru/og-image.png", width: 1200, height: 630 },
        ],
    },
}

export default async function BlogListPage() {
    const supabase = await createClient()

    const { data: articles } = await supabase
        .from("news")
        .select("*")
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("published_at", { ascending: false })

    const items = articles || []

    return (
        <main className="min-h-screen bg-background">
            <Header />

            <div className="sticky top-[4.5rem] z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
                <SiteBreadcrumb
                    items={[{ label: "Полезные статьи", href: "/blog" }]}
                    className="container mx-auto px-4 py-3"
                />
            </div>

            <section className="container mx-auto px-4 py-12">
                <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold">Полезные статьи</h1>
                </div>
                <p className="text-muted-foreground mb-10 max-w-2xl">
                    Всё, что нужно знать о покупке земельного участка в
                    Калининградской области: оформление, документы, коммуникации и
                    другие важные вопросы.
                </p>

                {items.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground">
                        <p className="text-lg">Статей пока нет</p>
                    </div>
                ) : (
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                        {items.map((item) => (
                            <article
                                key={item.id}
                                className="group rounded-3xl bg-card border border-border/50 overflow-hidden hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-1"
                            >
                                {item.image_url && (
                                    <Link
                                        href={`/blog/${item.slug || item.id}`}
                                        className="block relative h-56 bg-secondary/10 overflow-hidden"
                                    >
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
                                            {new Date(item.published_at).toLocaleDateString(
                                                "ru-RU",
                                                {
                                                    day: "numeric",
                                                    month: "long",
                                                    year: "numeric",
                                                }
                                            )}
                                        </div>
                                    )}

                                    <Link href={`/blog/${item.slug || item.id}`}>
                                        <h2 className="text-xl font-semibold mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                                            {item.title}
                                        </h2>
                                    </Link>

                                    <p className="text-muted-foreground leading-relaxed line-clamp-3 mb-4">
                                        {item.meta_description ||
                                            item.content
                                                .replace(/<[^>]*>/g, " ")
                                                .replace(/\s+/g, " ")
                                                .trim()
                                                .substring(0, 160)}
                                    </p>

                                    <Link
                                        href={`/blog/${item.slug || item.id}`}
                                        className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
                                    >
                                        Читать статью
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
