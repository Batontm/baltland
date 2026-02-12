import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, ArrowLeft } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Header } from "@/components/calming/header"
import { Footer } from "@/components/calming/footer"
import type { Metadata } from 'next'
import { SiteBreadcrumb } from "@/components/site-breadcrumb"
import { NewsArticleJsonLd } from "@/components/seo/article-jsonld"

export const revalidate = 3600 // ISR: revalidate every hour

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()

  const { data: newsItem } = await supabase
    .from("news")
    .select("title, content")
    .eq("id", id)
    .single()

  if (!newsItem) return { title: "Новость не найдена" }

  const description = newsItem.content
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 160)

  const canonical = `https://baltland.ru/news/${id}`

  return {
    title: newsItem.title,
    description,
    alternates: { canonical },
    openGraph: {
      title: newsItem.title,
      description,
      url: canonical,
      type: 'article',
    },
  }
}

export default async function NewsDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: newsItem, error } = await supabase
    .from("news")
    .select("*")
    .eq("id", id)
    .eq("is_published", true)
    .single()

  if (error || !newsItem) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <div className="sticky top-[4.5rem] z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 max-w-4xl py-3">
          <SiteBreadcrumb
            items={[
              { label: "Новости", href: "/news" },
              { label: newsItem.title, href: `/news/${id}` },
            ]}
          />
          <NewsArticleJsonLd
            title={newsItem.title}
            description={newsItem.content.substring(0, 160)}
            image={newsItem.image_url}
            datePublished={newsItem.published_at}
            dateModified={newsItem.updated_at}
            authorName={newsItem.author || "БалтикЗемля"}
            publisherName="БалтикЗемля"
            publisherLogo="https://baltland.ru/logo.png"
            url={`https://baltland.ru/news/${id}`}
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
            href="/news"
            className="group inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8 transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border group-hover:border-primary/30 group-hover:bg-primary/5 transition-all">
              <ArrowLeft className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium">Вернуться к новостям</span>
          </Link>

          {/* Header */}
          <div className="mb-12">
            <Badge variant="secondary" className="mb-6 rounded-full px-4 py-1.5 bg-secondary/50 backdrop-blur-sm border-border/50">
              Новости компании
            </Badge>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-medium mb-8 text-balance leading-[1.1]">
              {newsItem.title}
            </h1>

            <div className="flex flex-wrap items-center gap-6 text-muted-foreground border-y border-border/50 py-6">
              {newsItem.published_at && (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary/30">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <time dateTime={newsItem.published_at} className="text-sm font-medium text-foreground">
                    {new Date(newsItem.published_at).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </time>
                </div>
              )}
              {newsItem.author && (
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-2xl bg-secondary/30 flex items-center justify-center font-bold text-primary">
                    {newsItem.author[0]}
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Опубликовал</div>
                    <div className="text-sm font-medium text-foreground">{newsItem.author}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Featured Image */}
          {newsItem.image_url && (
            <div className="relative h-[300px] sm:h-[450px] lg:h-[550px] rounded-[2.5rem] overflow-hidden mb-12 shadow-2xl shadow-primary/5 border border-border/50 bg-secondary/10">
              <Image
                src={newsItem.image_url}
                alt={newsItem.title}
                fill
                className="object-contain"
                priority
              />
            </div>
          )}

          {/* Content */}
          <div className="prose prose-lg prose-headings:font-serif prose-headings:font-medium prose-p:leading-relaxed prose-p:text-foreground/90 max-w-none">
            <div className="whitespace-pre-wrap font-sans">
              {newsItem.content}
            </div>
          </div>

          {/* Footer Navigation */}
          <div className="mt-20 pt-10 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-6">
            <Link href="/news">
              <Button variant="outline" size="lg" className="rounded-2xl h-14 px-8 border-border/50 hover:bg-secondary/50 transition-all font-medium">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Все новости
              </Button>
            </Link>

            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground font-medium">Поделиться:</span>
              {/* Placeholders for share social icons if needed */}
              <div className="flex gap-2">
                <div className="h-10 w-10 rounded-full border border-border/50 flex items-center justify-center hover:bg-secondary/50 cursor-pointer transition-colors">
                  <span className="text-xs font-bold">VK</span>
                </div>
                <div className="h-10 w-10 rounded-full border border-border/50 flex items-center justify-center hover:bg-secondary/50 cursor-pointer transition-colors">
                  <span className="text-xs font-bold">TG</span>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
      <Footer />
    </main>
  )
}
