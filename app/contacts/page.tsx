import type { Metadata } from "next"
import { Phone, Mail, MapPin, Clock, Send, MessageCircle, Youtube, Instagram } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Header } from "@/components/calming/header"
import { Footer } from "@/components/calming/footer"
import { SiteBreadcrumb } from "@/components/site-breadcrumb"
import { createClient } from "@/lib/supabase/server"
import { ContactsMapWrapper } from "./contacts-map-wrapper"

export const metadata: Metadata = {
    title: "Контакты",
    description: "Контакты компании БалтикЗемля — телефон, email, адрес офиса в Калининграде. Продажа земельных участков в Калининградской области.",
    alternates: {
        canonical: "https://baltland.ru/contacts",
    },
    openGraph: {
        title: "Контакты",
        description: "Свяжитесь с нами для подбора земельного участка в Калининградской области.",
        url: "https://baltland.ru/contacts",
        type: "website",
        images: [{ url: "https://baltland.ru/og-image.png", width: 1200, height: 630 }],
    },
}

function ensureProtocol(url: string) {
    return url.startsWith("http") ? url : `https://${url}`
}

export default async function ContactsPage() {
    const supabase = await createClient()
    const { data } = await supabase
        .from("organization_settings")
        .select("*")
        .eq("id", "00000000-0000-0000-0000-000000000001")
        .maybeSingle()

    const settings = data as any

    const phone = settings?.phone || "+7 931 605-44-84"
    const email = settings?.email || "info@baltland.ru"
    const address = settings?.address || "Калининград, ул. Брамса, 40"
    const workingHours = settings?.working_hours || "Пн-Пт: 09:00-18:00"
    const orgName = settings?.organization_name || "БалтикЗемля"

    // Office coordinates (Kaliningrad, ul. Bramsa 40)
    const officeLat = 54.726262
    const officeLon = 20.494219

    const socials: { name: string; url: string; icon: React.ReactNode; show: boolean }[] = [
        {
            name: "VK",
            url: settings?.vk_url || "",
            icon: (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.785 16.241s.288-.032.436-.194c.136-.148.132-.427.132-.427s-.02-1.304.578-1.496c.59-.19 1.346 1.26 2.148 1.818.606.422 1.067.33 1.067.33l2.144-.03s1.122-.07.59-.967c-.044-.073-.31-.663-1.597-1.875-1.349-1.27-1.168-1.064.456-3.26.99-1.338 1.385-2.154 1.262-2.503-.117-.333-.842-.245-.842-.245l-2.414.015s-.179-.025-.312.056c-.13.08-.214.265-.214.265s-.383 1.037-.893 1.918c-1.075 1.86-1.506 1.96-1.682 1.843-.41-.27-.307-1.086-.307-1.665 0-1.81.27-2.565-.527-2.76-.265-.065-.46-.108-1.138-.115-.87-.009-1.605.003-2.02.21-.277.138-.49.446-.36.464.16.021.523.1.715.365.248.342.24 1.11.24 1.11s.143 2.13-.334 2.395c-.328.182-.777-.19-1.742-1.89-.494-.863-.867-1.817-.867-1.817s-.072-.18-.2-.276c-.155-.117-.372-.154-.372-.154l-2.29.015s-.344.01-.47.162c-.112.135-.009.413-.009.413s1.8 4.282 3.836 6.442c1.87 1.984 3.99 1.85 3.99 1.85h.964z" />
                </svg>
            ),
            show: !!settings?.show_vk && !!settings?.vk_url,
        },
        {
            name: "Telegram",
            url: settings?.telegram_url || "",
            icon: <Send className="w-5 h-5" />,
            show: !!settings?.show_telegram && !!settings?.telegram_url,
        },
        {
            name: "WhatsApp",
            url: settings?.whatsapp_url || "",
            icon: <MessageCircle className="w-5 h-5" />,
            show: !!settings?.show_whatsapp && !!settings?.whatsapp_url,
        },
        {
            name: "YouTube",
            url: settings?.youtube_url || "",
            icon: <Youtube className="w-5 h-5" />,
            show: !!settings?.show_youtube && !!settings?.youtube_url,
        },
        {
            name: "Instagram",
            url: settings?.instagram_url || "",
            icon: <Instagram className="w-5 h-5" />,
            show: !!settings?.show_instagram && !!settings?.instagram_url,
        },
    ]

    const activeSocials = socials.filter((s) => s.show)

    const phoneDigits = phone.replace(/\D/g, "")

    return (
        <div className="min-h-screen bg-background">
            <Header />

            <div className="sticky top-[4.5rem] z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
                <div className="container mx-auto px-4 py-3">
                    <SiteBreadcrumb items={[{ label: "Контакты", href: "/contacts" }]} />
                </div>
            </div>

            <main className="container mx-auto px-4 py-12">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="mb-10">
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Контакты</h1>
                        <p className="text-lg text-muted-foreground">
                            Свяжитесь с нами для подбора земельного участка в Калининградской области
                        </p>
                    </div>

                    {/* Contact cards grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                        {/* Phone */}
                        <Card className="group hover:shadow-lg hover:shadow-primary/5 transition-all border-border/50">
                            <CardContent className="p-6">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                                    <Phone className="h-6 w-6 text-primary" />
                                </div>
                                <p className="text-sm text-muted-foreground mb-1">Телефон</p>
                                <a
                                    href={`tel:+${phoneDigits}`}
                                    className="text-lg font-semibold hover:text-primary transition-colors"
                                >
                                    {phone}
                                </a>
                            </CardContent>
                        </Card>

                        {/* Email */}
                        <Card className="group hover:shadow-lg hover:shadow-primary/5 transition-all border-border/50">
                            <CardContent className="p-6">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                                    <Mail className="h-6 w-6 text-primary" />
                                </div>
                                <p className="text-sm text-muted-foreground mb-1">Email</p>
                                <a
                                    href={`mailto:${email}`}
                                    className="text-lg font-semibold hover:text-primary transition-colors"
                                >
                                    {email}
                                </a>
                            </CardContent>
                        </Card>

                        {/* Address */}
                        <Card className="group hover:shadow-lg hover:shadow-primary/5 transition-all border-border/50">
                            <CardContent className="p-6">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                                    <MapPin className="h-6 w-6 text-primary" />
                                </div>
                                <p className="text-sm text-muted-foreground mb-1">Офис</p>
                                <p className="text-lg font-semibold">{address}</p>
                            </CardContent>
                        </Card>

                        {/* Working hours */}
                        <Card className="group hover:shadow-lg hover:shadow-primary/5 transition-all border-border/50">
                            <CardContent className="p-6">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                                    <Clock className="h-6 w-6 text-primary" />
                                </div>
                                <p className="text-sm text-muted-foreground mb-1">Режим работы</p>
                                <p className="text-lg font-semibold">{workingHours}</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Social media */}
                    {activeSocials.length > 0 && (
                        <div className="mb-10">
                            <h2 className="text-xl font-semibold mb-4">Мы в социальных сетях</h2>
                            <div className="flex flex-wrap gap-3">
                                {activeSocials.map((social) => (
                                    <a
                                        key={social.name}
                                        href={ensureProtocol(social.url)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-secondary/50 hover:bg-secondary text-sm font-medium transition-colors"
                                    >
                                        {social.icon}
                                        {social.name}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Map */}
                    <div>
                        <h2 className="text-xl font-semibold mb-4">Как нас найти</h2>
                        <div className="rounded-2xl overflow-hidden border border-border/50 shadow-lg" style={{ height: "450px" }}>
                            <ContactsMapWrapper lat={officeLat} lon={officeLon} address={address} />
                        </div>
                        <p className="text-sm text-muted-foreground mt-3">
                            {address}
                        </p>
                    </div>

                    {/* JSON-LD */}
                    <script
                        type="application/ld+json"
                        dangerouslySetInnerHTML={{
                            __html: JSON.stringify({
                                "@context": "https://schema.org",
                                "@type": "ContactPage",
                                mainEntity: {
                                    "@type": "RealEstateAgent",
                                    name: orgName,
                                    telephone: phone,
                                    email: email,
                                    address: {
                                        "@type": "PostalAddress",
                                        streetAddress: address,
                                        addressLocality: "Калининград",
                                        addressRegion: "Калининградская область",
                                        addressCountry: "RU",
                                    },
                                    geo: {
                                        "@type": "GeoCoordinates",
                                        latitude: officeLat,
                                        longitude: officeLon,
                                    },
                                    openingHours: workingHours,
                                },
                            }),
                        }}
                    />
                </div>
            </main>

            <Footer />
        </div>
    )
}
