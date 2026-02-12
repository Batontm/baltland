import Link from "next/link"
import type { Metadata } from "next"
import { ShieldCheck, ArrowLeft, FileText, Download, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getLegalContent } from "@/app/actions"
import { SiteBreadcrumb } from "@/components/site-breadcrumb"

export const revalidate = 300

export const metadata: Metadata = {
    title: "Юридическая чистота",
    description: "Юридическая проверка земельных участков в Калининградской области. Документы, обременения, гарантии безопасности сделки от БалтикЗемля.",
    alternates: {
        canonical: "https://baltland.ru/legal",
    },
}

export default async function LegalPage() {
    const items = await getLegalContent(true)

    return (
        <main className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-emerald-600 transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="text-sm font-medium">На главную</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-emerald-600" />
                        <span className="font-bold text-slate-900">Юридическая чистота</span>
                    </div>
                    <div className="w-20" /> {/* Spacer */}
                </div>
            </div>

            <div className="sticky top-16 z-40 bg-slate-50/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 py-3">
                    <SiteBreadcrumb
                        items={[{ label: "Юридическая чистота", href: "/legal" }]}
                    />
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 pt-8">
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Безопасность каждой сделки</h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        Мы проводим тщательную юридическую проверку каждого участка перед продажей.
                        Здесь собраны основные документы и информация, подтверждающая чистоту наших объектов.
                    </p>
                </div>

                <div className="space-y-12">
                    {items.length === 0 ? (
                        <Card className="p-12 text-center border-dashed">
                            <p className="text-slate-500">Разделы скоро появятся...</p>
                        </Card>
                    ) : (
                        items.map((item) => (
                            <section key={item.id} className="scroll-mt-24">
                                <Card className="overflow-hidden border-none shadow-sm bg-white">
                                    <div className="flex flex-col md:flex-row">
                                        {item.image_url && (
                                            <div className="md:w-1/3 h-48 md:h-auto relative overflow-hidden">
                                                <img
                                                    src={item.image_url}
                                                    alt={item.title}
                                                    className="absolute inset-0 w-full h-full object-cover"
                                                />
                                            </div>
                                        )}
                                        <CardContent className={`p-8 ${item.image_url ? 'md:w-2/3' : 'w-full'}`}>
                                            <h2 className="text-2xl font-bold text-slate-900 mb-4">{item.title}</h2>
                                            <div className="prose prose-slate prose-emerald max-w-none mb-6">
                                                {item.content.split('\n').map((para, i) => (
                                                    <p key={i} className="text-slate-600 leading-relaxed mb-4">{para}</p>
                                                ))}
                                            </div>

                                            {item.pdf_url && (
                                                <Button asChild variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300">
                                                    <a href={item.pdf_url} target="_blank" rel="noopener noreferrer">
                                                        <Download className="mr-2 h-4 w-4" /> Скачать образец документа (PDF)
                                                    </a>
                                                </Button>
                                            )}
                                        </CardContent>
                                    </div>
                                </Card>
                            </section>
                        ))
                    )}
                </div>

                {/* Contact CTA */}
                <div className="mt-20 p-10 bg-emerald-600 rounded-3xl text-white text-center relative overflow-hidden shadow-xl shadow-emerald-200">
                    <div className="relative z-10">
                        <h3 className="text-3xl font-bold mb-4">Остались вопросы по оформлению?</h3>
                        <p className="text-emerald-50 opacity-90 mb-8 max-w-xl mx-auto text-lg leading-relaxed">
                            Наши юристы бесплатно проконсультируют вас по всем нюансам заключения договора и оформления собственности.
                        </p>
                        <Button asChild size="lg" className="bg-white text-emerald-700 hover:bg-emerald-50 border-none px-8 h-14 text-lg font-bold rounded-2xl">
                            <Link href="/contacts">Связаться с юристом</Link>
                        </Button>
                    </div>
                    <ShieldCheck className="absolute -bottom-10 -right-10 h-64 w-64 text-emerald-500 opacity-20 rotate-12" />
                </div>
            </div>
        </main>
    )
}
