import type React from "react"
import type { Metadata } from "next"

import { FloatingChat } from "@/components/chat/floating-chat"
import { Toaster } from "@/components/ui/toaster"
import { YandexMetrika } from "@/components/analytics/yandex-metrika"
import { createClient } from "@/lib/supabase/server"
import "./globals.css"

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("organization_settings")
    .select("favicon_url")
    .eq("id", "00000000-0000-0000-0000-000000000001")
    .maybeSingle()

  const faviconUrl = (data as any)?.favicon_url ? String((data as any).favicon_url) : null

  const baseUrl = "https://baltland.ru"
  const title = "Купить участок ИЖС в Калининграде — от 100 тыс. ₽ | BaltLand"
  const description =
    "Продажа земельных участков в Калининградской области. Более 12 лет помогаем людям обрести свой уголок у Балтийского моря."

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: "БалтикЗемля — Земельные участки в Калининградской области",
      template: "%s | БалтикЗемля"
    },
    description: "Продажа земельных участков в Калининградской области. Профессиональный подбор, юридическое сопровождение, честные цены.",
    generator: "v0.app",
    alternates: {
      canonical: "./",
    },
    openGraph: {
      title,
      description,
      url: baseUrl,
      siteName: "БалтикЗемля",
      locale: "ru_RU",
      type: "website",
      images: [
        {
          url: `${baseUrl}/og-image.png`,
          width: 1200,
          height: 630,
          alt: "БалтикЗемля - Земельные участки в Калининградской области",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    icons: faviconUrl
      ? {
        icon: [{ url: faviconUrl }],
      }
      : {
        icon: [
          {
            url: "/favicon-120.png",
            sizes: "120x120",
            type: "image/png",
          },
          {
            url: "/favicon.ico",
            sizes: "32x32",
            type: "image/x-icon",
          },
          {
            url: "/icon-light-32x32.png",
            media: "(prefers-color-scheme: light)",
          },
          {
            url: "/icon-dark-32x32.png",
            media: "(prefers-color-scheme: dark)",
          },
        ],
        shortcut: "/favicon.ico",
        apple: "/apple-icon.png",
      },
  }
}

const toOpeningHours = (workingHours: string | null | undefined): string | undefined => {
  const raw = (workingHours || "").trim()
  if (!raw) return undefined

  const m = raw.match(/^(Пн|Вт|Ср|Чт|Пт|Сб|Вс)\s*-\s*(Пн|Вт|Ср|Чт|Пт|Сб|Вс)\s*:\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/)
  if (!m) return undefined

  const map: Record<string, string> = {
    "Пн": "Mo",
    "Вт": "Tu",
    "Ср": "We",
    "Чт": "Th",
    "Пт": "Fr",
    "Сб": "Sa",
    "Вс": "Su",
  }

  const from = map[m[1]]
  const to = map[m[2]]
  if (!from || !to) return undefined
  return `${from}-${to} ${m[3]}-${m[4]}`
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("organization_settings")
    .select("organization_name, phone, email, address, working_hours, logo_url")
    .eq("id", "00000000-0000-0000-0000-000000000001")
    .maybeSingle()

  const baseUrl = "https://baltland.ru"
  const openingHours = toOpeningHours((data as any)?.working_hours)
  const phone = (data as any)?.phone ? String((data as any).phone) : null
  const email = (data as any)?.email ? String((data as any).email) : null
  const address = (data as any)?.address ? String((data as any).address) : null
  const orgName = (data as any)?.organization_name ? String((data as any).organization_name) : "БалтикЗемля"
  const logoUrl = (data as any)?.logo_url ? String((data as any).logo_url) : null

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": ["RealEstateAgent", "LocalBusiness"],
    "@id": `${baseUrl}/#organization`,
    name: orgName,
    alternateName: "БалтикЗемля",
    url: baseUrl,
    logo: logoUrl || `${baseUrl}/logo.png`,
    image: logoUrl || `${baseUrl}/og-image.png`,
    description: "Продажа земельных участков в Калининградской области. Более 12 лет помогаем людям обрести свой уголок у Балтийского моря.",
    telephone: phone || "+7 931 605-44-84",
    email: email || "info@baltland.ru",
    priceRange: "₽₽",
    currenciesAccepted: "RUB",
    paymentAccepted: "Наличные, Банковский перевод, Рассрочка",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "156",
      bestRating: "5",
      worstRating: "1",
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: address || "ул. Брамса, 40",
      addressLocality: "Калининград",
      addressRegion: "Калининградская область",
      postalCode: "236006",
      addressCountry: {
        "@type": "Country",
        name: "RU"
      }
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 54.7104,
      longitude: 20.4522
    },
    areaServed: {
      "@type": "AdministrativeArea",
      name: "Калининградская область"
    },
    openingHoursSpecification: openingHours ? [{
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "18:00"
    }] : undefined,
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: phone || "+7 931 605-44-84",
        contactType: "sales",
        availableLanguage: ["Russian"],
        areaServed: "RU"
      },
      {
        "@type": "ContactPoint",
        email: email || "info@baltland.ru",
        contactType: "customer service"
      }
    ],
    sameAs: [
      "https://t.me/baltland",
      "https://vk.com/baltland"
    ],
    foundingDate: "2012",
    numberOfEmployees: {
      "@type": "QuantitativeValue",
      minValue: 5,
      maxValue: 15
    },
    slogan: "Ваш уголок у Балтийского моря",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/catalog?search={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  }

  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        {children}
        <Toaster />
        <FloatingChat />
        <YandexMetrika />

      </body>
    </html>
  )
}
