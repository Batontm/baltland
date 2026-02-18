import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { CheckCircle2 } from "lucide-react"

import { Header } from "@/components/calming/header"
import { Footer } from "@/components/calming/footer"
import { SiteBreadcrumb } from "@/components/site-breadcrumb"
import { createClient } from "@/lib/supabase/server"

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = "https://baltland.ru"
  const title = "Профессиональная геодезия в подарок"
  const description =
    "Покупая участок в Балтланд, вы получаете полный комплекс геодезических работ бесплатно: выезд специалиста, топосъёмка, данные о перепадах высот, схема инженерных сетей."

  return {
    title,
    description,
    alternates: { canonical: `${baseUrl}/geodesy` },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/geodesy`,
      type: "website",
      images: [{ url: `${baseUrl}/geodesy-promo.png` }],
    },
  }
}

const benefits = [
  "Выезд специалиста и установка границ",
  "Топосъёмка территории",
  "Данные о перепадах высот",
  "Схема расположения инженерных сетей",
]

export default async function GeodesyPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("organization_settings")
    .select("home_promo_1_image_url")
    .eq("id", "00000000-0000-0000-0000-000000000001")
    .maybeSingle()

  const promoImageUrl = (data as any)?.home_promo_1_image_url || "/geodesy-promo.png"
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="sticky top-[4.5rem] z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <SiteBreadcrumb
          items={[
            { label: "Геодезия в подарок", href: "/geodesy" },
          ]}
          className="container mx-auto px-4 py-3"
        />
      </div>

      <section className="relative px-4 md:px-8 py-12">
        <div className="max-w-6xl mx-auto grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div className="order-2 lg:order-1">
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-600 font-semibold mb-4">Подарок покупателю</p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-foreground leading-tight">
              Профессиональная геодезия в подарок
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              Покупая землю у нас, вы получаете полный комплекс геодезических работ совершенно бесплатно.
              Это экономит ваше время и деньги, а документы по участку сразу готовы для дальнейшего
              проектирования и строительства.
            </p>
            <div className="mt-8 space-y-4">
              {benefits.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 mt-0.5" />
                  <p className="text-base text-foreground/90">{item}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/catalog"
                className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700"
              >
                Перейти в каталог
              </Link>
              <Link
                href="/contacts"
                className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700"
              >
                Задать вопрос
              </Link>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-card shadow-[0_30px_80px_rgba(0,0,0,0.12)]">
              <Image
                src={promoImageUrl}
                alt="Профессиональная геодезия в подарок"
                width={900}
                height={520}
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
