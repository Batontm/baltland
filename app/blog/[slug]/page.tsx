import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, ArrowLeft } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Header } from "@/components/calming/header"
import { Footer } from "@/components/calming/footer"
import type { Metadata } from "next"
import { SiteBreadcrumb } from "@/components/site-breadcrumb"
import { NewsArticleJsonLd } from "@/components/seo/article-jsonld"
import { BlogCTA } from "@/components/blog/blog-cta"
import { RelatedArticles } from "@/components/blog/related-articles"

export const revalidate = 3600

interface PageProps {
    params: Promise<{ slug: string }>
}

async function getArticle(slug: string) {
    const supabase = await createClient()

    // Try by slug first, then by id (for backward compatibility)
    const { data: article } = await supabase
        .from("news")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .single()

    if (article) return article

    // Fallback: try by id
    const { data: byId } = await supabase
        .from("news")
        .select("*")
        .eq("id", slug)
        .eq("is_published", true)
        .single()

    return byId || null
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params
    const article = await getArticle(slug)

    if (!article) return { title: "Статья не найдена" }

    const title = article.meta_title || article.title
    const description =
        article.meta_description ||
        article.content
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .substring(0, 160)

    const canonical = `https://baltland.ru/blog/${article.slug || article.id}`

    return {
        title,
        description,
        alternates: { canonical },
        openGraph: {
            title,
            description,
            url: canonical,
            type: "article",
            ...(article.image_url && {
                images: [{ url: article.image_url, width: 1200, height: 630 }],
            }),
        },
    }
}

export default async function BlogArticlePage({ params }: PageProps) {
    const { slug } = await params
    const article = await getArticle(slug)

    if (!article) {
        notFound()
    }

    // Fetch related articles (excluding current)
    const supabase = await createClient()
    const { data: relatedArticles } = await supabase
        .from("news")
        .select("id, title, slug, meta_description, content, image_url, published_at")
        .eq("is_published", true)
        .neq("id", article.id)
        .order("sort_order", { ascending: true })
        .limit(3)

    return (
        <main className="min-h-screen bg-background">
            <Header />

            <div className="sticky top-[4.5rem] z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
                <div className="container mx-auto px-4 max-w-4xl py-3">
                    <SiteBreadcrumb
                        items={[
                            { label: "Полезные статьи", href: "/blog" },
                            { label: article.title, href: `/blog/${article.slug || article.id}` },
                        ]}
                    />
                    <NewsArticleJsonLd
                        title={article.meta_title || article.title}
                        description={
                            article.meta_description ||
                            article.content.substring(0, 160)
                        }
                        image={article.image_url}
                        datePublished={article.published_at}
                        dateModified={article.updated_at}
                        authorName={article.author || "БалтикЗемля"}
                        publisherName="БалтикЗемля"
                        publisherLogo="https://baltland.ru/logo.png"
                        url={`https://baltland.ru/blog/${article.slug || article.id}`}
                    />
                </div>
            </div>

            {/* Background patterns */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/5 blur-[120px] rounded-full -translate-x-1/2 translate-y-1/2" />
            </div>

            <div className="relative pt-8 pb-24">
                <article className="container mx-auto px-4 max-w-4xl">
                    {/* Back button */}
                    <Link
                        href="/blog"
                        className="group inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8 transition-colors"
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border group-hover:border-primary/30 group-hover:bg-primary/5 transition-all">
                            <ArrowLeft className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium">Все статьи</span>
                    </Link>

                    {/* Header */}
                    <div className="mb-12">
                        <Badge
                            variant="secondary"
                            className="mb-6 rounded-full px-4 py-1.5 bg-secondary/50 backdrop-blur-sm border-border/50"
                        >
                            Полезные статьи
                        </Badge>

                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-medium mb-8 text-balance leading-[1.1]">
                            {article.title}
                        </h1>

                        <div className="flex flex-wrap items-center gap-6 text-muted-foreground border-y border-border/50 py-6">
                            {article.published_at && (
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary/30">
                                        <Calendar className="h-5 w-5 text-primary" />
                                    </div>
                                    <time
                                        dateTime={article.published_at}
                                        className="text-sm font-medium text-foreground"
                                    >
                                        {new Date(article.published_at).toLocaleDateString(
                                            "ru-RU",
                                            {
                                                day: "numeric",
                                                month: "long",
                                                year: "numeric",
                                            }
                                        )}
                                    </time>
                                </div>
                            )}
                            {article.author && (
                                <div className="flex items-center gap-2.5">
                                    <div className="h-10 w-10 rounded-2xl bg-secondary/30 flex items-center justify-center font-bold text-primary">
                                        {article.author[0]}
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                                            Автор
                                        </div>
                                        <div className="text-sm font-medium text-foreground">
                                            {article.author}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Featured Image */}
                    {article.image_url && (
                        <div className="relative h-[300px] sm:h-[450px] lg:h-[550px] rounded-[2.5rem] overflow-hidden mb-12 shadow-2xl shadow-primary/5 border border-border/50 bg-secondary/10">
                            <Image
                                src={article.image_url}
                                alt={article.title}
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                    )}

                    {/* Content */}
                    <div className="prose prose-lg prose-headings:font-serif prose-headings:font-medium prose-p:leading-relaxed prose-p:text-foreground/90 max-w-none">
                        <div
                            className="font-sans"
                            dangerouslySetInnerHTML={{ __html: article.content }}
                        />
                    </div>

                    {/* CTA Block */}
                    <BlogCTA />

                    {/* Related Articles */}
                    <RelatedArticles articles={relatedArticles || []} />

                    {/* Footer Navigation */}
                    <div className="mt-12 pt-10 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-6">
                        <Link href="/blog">
                            <Button
                                variant="outline"
                                size="lg"
                                className="rounded-2xl h-14 px-8 border-border/50 hover:bg-secondary/50 transition-all font-medium"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Все статьи
                            </Button>
                        </Link>

                        <Link href="/catalog">
                            <Button
                                size="lg"
                                className="rounded-2xl h-14 px-8 transition-all font-medium"
                            >
                                Каталог участков
                            </Button>
                        </Link>
                    </div>
                </article>
            </div>
            <Footer />
        </main>
    )
}
