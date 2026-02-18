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
  const title = "Скидка 50% на кадастровые услуги"
  const description =
    "Купите участок в Балтланд и получите скидку 50% на кадастровые услуги: оформление документов, регистрация объекта, межевой план."

  return {
    title,
    description,
    alternates: { canonical: `${baseUrl}/cadastral-discount` },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/cadastral-discount`,
      type: "website",
      images: [{ url: `${baseUrl}/geodesy-promo-2.png` }],
    },
  }
}

const benefits = [
  "Оформление документов для будущей стройки",
  "Регистрация объекта недвижимости",
  "Создание межевого плана",
]

export default async function CadastralDiscountPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("organization_settings")
    .select("home_promo_2_image_url")
    .eq("id", "00000000-0000-0000-0000-000000000001")
    .maybeSingle()

  const promoImageUrl = (data as any)?.home_promo_2_image_url || "/geodesy-promo-2.png"
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="sticky top-[4.5rem] z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <SiteBreadcrumb
          items={[
            { label: "Скидка 50% на кадастровые услуги", href: "/cadastral-discount" },
          ]}
          className="container mx-auto px-4 py-3"
        />
      </div>

      <section className="relative px-4 md:px-8 py-12">
        <div className="max-w-6xl mx-auto grid gap-10 lg:grid-cols-[1.05fr_0.95fr] items-center">
          <div className="order-2 lg:order-1">
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-600 font-semibold mb-4">Акция месяца</p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-foreground leading-tight">
              Скидка 50% на кадастровые услуги
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              Купите участок в нашей компании и получите скидку 50% на полный комплекс кадастровых услуг для вашей земли.
              Мы берём на себя подготовку документов и согласования, чтобы вы могли быстрее приступить к строительству.
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
                alt="Скидка 50% на кадастровые услуги"
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
