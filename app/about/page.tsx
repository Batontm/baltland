import { OrganizationSettings } from "@/lib/types"
import { getOrganizationSettings } from "@/app/actions"
import { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle2, ShieldCheck, MapPin, Users } from "lucide-react"
import { Header } from "@/components/calming/header"
import { Footer } from "@/components/calming/footer"
import { SiteBreadcrumb } from "@/components/site-breadcrumb"

export const metadata: Metadata = {
    title: "О компании",
    description: "Ваш эксперт по земельным активам в Калининградской области. Продажа, подбор и юридическое сопровождение сделок с недвижимостью.",
    alternates: {
        canonical: "https://baltland.ru/about",
    },
    openGraph: {
        title: "О компании",
        description: "Ваш эксперт по земельным активам в Калининградской области.",
        url: "https://baltland.ru/about",
        type: "website",
        images: [{ url: "https://baltland.ru/og-image.png", width: 1200, height: 630 }],
    },
}

export default async function AboutPage() {
    const settings = (await getOrganizationSettings()) as OrganizationSettings

    const title = settings?.about_company_title || "О компании «БалтикЗемля»"
    const subtitle = settings?.about_company_subtitle || "Ваш эксперт по земельным активам в самом сердце Балтики."
    const content = settings?.about_company_content ||
        `«БалтикЗемля» — ведущая экспертная компания на рынке загородной и коммерческой недвижимости Калининградской области. Мы специализируемся на подборе, проверке и продаже земельных участков, помогая нашим клиентам строить будущее на самой западной земле России.

За 15 лет работы мы прошли путь от небольшого агентства до компании, которая знает каждый гектар Янтарного края — от песчаных дюн побережья до плодородных земель восточных районов.`

    const stats = (Array.isArray(settings?.about_company_stats) && settings.about_company_stats.length > 0)
        ? settings.about_company_stats
        : [
            { value: "15 лет", label: "безупречной репутации на рынке недвижимости" },
            { value: "500+", label: "закрытых сделок: от уютных дачных наделов до крупных массивов под ИЖС и промышленность" },
            { value: "100%", label: "юридическая чистота: мы не просто продаем участки, мы обеспечиваем безопасность каждой подписи в договоре" },
            { value: "39-й регион", label: "наш дом: мы работаем только в Калининградской области, поэтому знаем все локальные нюансы" },
        ]

    const advantages = (Array.isArray(settings?.about_company_advantages) && settings.about_company_advantages.length > 0)
        ? settings.about_company_advantages
        : [
            {
                title: "Экспертность в локации",
                description: "Калининградская область имеет свои уникальные особенности (приграничные зоны, культурное наследие). Мы знаем, где можно строить дом мечты.",
            },
            {
                title: "Безопасность и прозрачность",
                description: "Каждый объект в базе проходит многоступенчатую юридическую проверку. Мы гарантируем отсутствие обременений и скрытых споров.",
            },
            {
                title: "Полный цикл сопровождения",
                description: "Межевание, изменение ВРИ, получение ТУ на свет и газ, дистанционные сделки для клиентов из «большой» России.",
            },
        ]

    return (
        <div className="min-h-screen bg-background">
            <Header />

            <div className="sticky top-[4.5rem] z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
                <div className="container mx-auto px-4 py-3">
                    <SiteBreadcrumb items={[{ label: "О компании", href: "/about" }]} />
                </div>
            </div>

            {/* Hero Section */}
            <section className="relative py-20 lg:py-32 overflow-hidden bg-primary/5">
                <div className="container px-4 md:px-6 relative z-10">
                    <div className="max-w-3xl mx-auto text-center space-y-4">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-primary font-serif">
                            {title}
                        </h1>
                        <p className="text-xl text-muted-foreground md:text-2xl font-light">
                            {subtitle}
                        </p>
                    </div>
                </div>
                {/* Abstract shapes/bg */}
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-primary blur-3xl" />
                    <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-secondary blur-3xl" />
                </div>
            </section>

            {/* Main Content & Philosophy */}
            <section className="py-20">
                <div className="container px-4 md:px-6">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6 text-lg leading-relaxed text-muted-foreground whitespace-pre-line">
                            {content}
                        </div>
                        <div className="relative">
                            <div className="bg-secondary/20 p-8 rounded-3xl border border-border/50 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-10 opacity-5">
                                    <MapPin className="w-64 h-64" />
                                </div>
                                <h3 className="text-2xl font-serif font-bold mb-4 text-foreground">Наша философия</h3>
                                <p className="italic text-lg text-muted-foreground mb-6">
                                    "Земля — это единственный ресурс, который больше не производится. В «БалтикЗемля» мы верим, что покупка участка в нашем регионе — это не просто сделка, а инвестиция в качество жизни, чистый воздух и европейский комфорт.
                                </p>
                                <p className="font-medium text-primary text-xl">
                                    «Мы помогаем вам найти не просто сотки, а место, которое вы с гордостью назовете своим домом».
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-20 bg-muted/30 border-y border-border/50">
                <div className="container px-4 md:px-6">
                    <h2 className="text-3xl font-bold text-center mb-12 font-serif">Наша история в цифрах</h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {stats.map((stat: any, i: number) => (
                            <div key={i} className="flex flex-col items-center text-center p-6 bg-background rounded-2xl shadow-sm border border-border/50 hover:shadow-md transition-shadow">
                                <span className="text-4xl md:text-5xl font-bold text-primary mb-2 block">{stat.value}</span>
                                <span className="text-sm md:text-base text-muted-foreground">{stat.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Advantages Section */}
            <section className="py-20">
                <div className="container px-4 md:px-6">
                    <h2 className="text-3xl font-bold text-center mb-4 font-serif">Почему выбирают «БалтикЗемля»?</h2>
                    <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-16">
                        Мы работаем только в Калининградской области, поэтому знаем все локальные нюансы, от особенностей мелиорации до перспектив газификации.
                    </p>

                    <div className="grid md:grid-cols-3 gap-8">
                        {advantages.map((adv: any, i: number) => {
                            let Icon = ShieldCheck
                            if (i === 0) Icon = MapPin
                            if (i === 2) Icon = Users

                            return (
                                <div key={i} className="p-8 rounded-3xl bg-card border border-border/50 hover:border-primary/50 transition-colors group">
                                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-colors text-primary">
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-3">{adv.title}</h3>
                                    <p className="text-muted-foreground leading-relaxed">{adv.description}</p>
                                </div>
                            )
                        })}
                    </div>

                    {/* Pro Tip Block */}
                    <div className="mt-16 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 max-w-4xl mx-auto text-center md:text-left">
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-full text-emerald-700 dark:text-emerald-400 shrink-0">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div>
                            <h4 className="font-bold text-emerald-800 dark:text-emerald-300 text-lg mb-1">Совет эксперта</h4>
                            <p className="text-emerald-700 dark:text-emerald-400/80">
                                В портфеле БалтикЗемля всегда есть доступные решения для старта — подборки бюджетных участков до 500 000 рублей с потенциалом роста цены.
                            </p>
                        </div>
                        <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-400 shrink-0" asChild>
                            <Link href="/catalog?maxPrice=500000">Смотреть участки</Link>
                        </Button>
                    </div>

                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 bg-primary text-primary-foreground text-center">
                <div className="container px-4">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6 font-serif">Готовы начать поиск?</h2>
                    <p className="text-primary-foreground/80 text-lg max-w-2xl mx-auto mb-10">
                        Наши специалисты подберут лучшие предложения в Гурьевском, Зеленоградском, Светлогорском и других районах области.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Button size="lg" variant="secondary" className="w-full sm:w-auto text-primary font-bold" asChild>
                            <Link href="/catalog">Посмотреть каталог участков</Link>
                        </Button>
                        <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent border-primary-foreground/20 hover:bg-primary-foreground/10 text-primary-foreground hover:text-white" asChild>
                            <Link href="/contacts">Заказать обратный звонок</Link>
                        </Button>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    )
}
