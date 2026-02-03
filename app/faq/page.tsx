import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { FAQ_CATEGORIES, FaqItem } from "@/lib/types"
import { getFaqItems } from "@/app/actions"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Zap, FileText, CreditCard, MapPin, HelpCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { FaqContactForm } from "@/components/calming/faq-contact-form"
import type { Metadata } from "next"
import { SiteBreadcrumb } from "@/components/site-breadcrumb"

export const metadata: Metadata = {
    title: "Помощь покупателю | Частые вопросы | БалтикЗемля",
    description: "Ответы на частые вопросы о покупке земельных участков в Калининградской области. Документы, оформление, оплата, выбор локации.",
    alternates: {
        canonical: "https://baltland.ru/faq",
    },
}

export const dynamic = "force-dynamic"

export default async function FaqPage() {
    const allFaqItems = await getFaqItems(true) // Fetch only active items

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
        <div className="min-h-screen bg-[#FDFCFB] py-12 px-4 scroll-smooth">
            <div className="container mx-auto max-w-4xl mb-6">
                <SiteBreadcrumb
                    items={[{ label: "Помощь", href: "/faq" }]}
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

                        <FaqContactForm />
                    </div>
                )}
            </div>
        </div>
    )
}
