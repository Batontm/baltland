import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { FAQ_CATEGORIES, FaqItem } from "@/lib/types"
import { getFaqItems } from "@/app/actions"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Zap, FileText, CreditCard, MapPin, HelpCircle, ArrowLeft, BookOpen, ArrowRight } from "lucide-react"
import Link from "next/link"
import { FaqContactForm } from "@/components/calming/faq-contact-form"
import { Header } from "@/components/calming/header"
import { Footer } from "@/components/calming/footer"
import type { Metadata } from "next"
import { SiteBreadcrumb } from "@/components/site-breadcrumb"
import { FAQJsonLd } from "@/components/seo/faq-jsonld"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
    title: "Помощь покупателю | Частые вопросы",
    description: "Ответы на частые вопросы о покупке земельных участков в Калининградской области. Документы, оформление, оплата, выбор локации.",
    alternates: {
        canonical: "https://baltland.ru/faq",
    },
}

export const revalidate = 300

export default async function FaqPage() {
    const allFaqItems = await getFaqItems(true) // Fetch only active items

    // Fetch blog articles for internal linking
    const supabase = await createClient()
    const { data: blogArticles } = await supabase
        .from("news")
        .select("id, title, slug, meta_description")
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .limit(4)

    const groupedFaq = FAQ_CATEGORIES.map(cat => ({
        ...cat,
        items: allFaqItems.filter(item => item.category === cat.value)
    })).filter(group => group.items.length > 0)

    const getCategoryIcon = (iconName: string) => {
        switch (iconName) {
            case "Zap": return <Zap className="h-5 w-5 text-yellow-500" />
            case "FileText": return <FileText className="h-5 w-5 text-blue-500" />
            case "CreditCard": return <CreditCard className="h-5 w-5 text-green-500" />
            case "MapPin": return <MapPin className="h-5 w-5 text-red-500" />
            default: return <HelpCircle className="h-5 w-5 text-gray-500" />
        }
    }

    return (
        <main className="min-h-screen bg-background">
            <Header />
            <div className="bg-[#FDFCFB] py-12 px-4 scroll-smooth">
                <div className="container mx-auto max-w-4xl mb-6">
                    <SiteBreadcrumb
                        items={[{ label: "Помощь", href: "/faq" }]}
                    />
                    <FAQJsonLd
                        items={allFaqItems.map(item => ({
                            question: item.question,
                            answer: item.answer
                        }))}
                    />
                </div>
                <div className="max-w-4xl mx-auto space-y-12">
                    <div className="space-y-4">
                        <Link
                            href="/"
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Вернуться на главную
                        </Link>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">Помощь покупателю</h1>
                        <p className="text-lg text-slate-600 max-w-2xl">
                            Мы собрали ответы на самые частые вопросы, которые возникают при выборе и покупке земельного участка в Калининградской области.
                        </p>
                    </div>

                    {groupedFaq.length === 0 ? (
                        <Card className="p-12 text-center border-dashed rounded-3xl">
                            <HelpCircle className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                            <p className="text-slate-500">Вопросы пока не добавлены. Пожалуйста, зайдите позже.</p>
                        </Card>
                    ) : (
                        <div className="grid gap-12">
                            <div className="grid gap-8">
                                {groupedFaq.map((group) => (
                                    <section key={group.value} className="space-y-4">
                                        <div className="flex items-center gap-3 px-2">
                                            {getCategoryIcon(group.icon)}
                                            <h2 className="text-2xl font-semibold text-slate-800">{group.label}</h2>
                                        </div>

                                        <Accordion type="single" collapsible className="w-full bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                                            {group.items.map((item, idx) => (
                                                <AccordionItem
                                                    key={item.id}
                                                    value={item.id}
                                                    className={idx === group.items.length - 1 ? "border-b-0" : ""}
                                                >
                                                    <AccordionTrigger className="px-6 hover:bg-slate-50 transition-all text-left font-medium text-slate-700 decoration-0">
                                                        {item.question}
                                                    </AccordionTrigger>
                                                    <AccordionContent className="px-6 pb-4 pt-0 text-slate-600 leading-relaxed whitespace-pre-line">
                                                        {item.answer}
                                                    </AccordionContent>
                                                </AccordionItem>
                                            ))}
                                        </Accordion>
                                    </section>
                                ))}
                            </div>

                            <Card className="bg-emerald-600 text-white rounded-3xl border-none p-8 md:p-12 overflow-hidden relative">
                                <div className="relative z-10 space-y-4">
                                    <h2 className="text-2xl md:text-3xl font-bold">Остались вопросы?</h2>
                                    <p className="text-emerald-50 max-w-lg">
                                        Наши эксперты помогут разобраться во всех юридических тонкостях и подобрать идеальный участок.
                                    </p>
                                    <a
                                        href="#faq-form"
                                        className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-8 text-sm font-semibold text-emerald-600 shadow-sm transition-colors hover:bg-emerald-50"
                                    >
                                        Задать свой вопрос
                                    </a>
                                </div>
                                <div className="absolute top-0 right-0 p-8 opacity-10">
                                    <HelpCircle className="w-48 h-48" />
                                </div>
                            </Card>

                            {/* Blog Articles Block */}
                            {blogArticles && blogArticles.length > 0 && (
                                <section className="space-y-4">
                                    <div className="flex items-center justify-between px-2">
                                        <div className="flex items-center gap-3">
                                            <BookOpen className="h-5 w-5 text-primary" />
                                            <h2 className="text-2xl font-semibold text-slate-800">Полезные статьи</h2>
                                        </div>
                                        <Link
                                            href="/blog"
                                            className="flex items-center gap-1 text-sm text-primary font-medium hover:underline"
                                        >
                                            Все статьи
                                            <ArrowRight className="h-4 w-4" />
                                        </Link>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {blogArticles.map((article) => (
                                            <Link
                                                key={article.id}
                                                href={`/blog/${article.slug || article.id}`}
                                                className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-primary/30 hover:shadow-md transition-all"
                                            >
                                                <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                                    <BookOpen className="h-4 w-4 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-800 leading-snug">
                                                        {article.title}
                                                    </p>
                                                    {article.meta_description && (
                                                        <p className="text-sm text-slate-500 mt-1 line-clamp-1">
                                                            {article.meta_description}
                                                        </p>
                                                    )}
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </section>
                            )}

                            <FaqContactForm />
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </main>
    )
}
