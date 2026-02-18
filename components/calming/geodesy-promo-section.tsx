import Image from "next/image"
import Link from "next/link"

export function GeodesyPromoSection(props: {
  promo1?: { imageUrl?: string | null; href?: string | null } | null
  promo2?: { imageUrl?: string | null; href?: string | null } | null
} = {}) {
  const promo1ImageUrl = props.promo1?.imageUrl || "/geodesy-promo.png"
  const promo1Href = props.promo1?.href || "/geodesy"
  const promo2ImageUrl = props.promo2?.imageUrl || "/geodesy-promo-2.png"
  const promo2Href = props.promo2?.href || "/cadastral-discount"

  const slides = [
    {
      src: promo1ImageUrl,
      alt: "Профессиональная геодезия в подарок при покупке участка",
      href: promo1Href,
      label: "Геодезия в подарок",
      position: "center",
    },
    {
      src: promo2ImageUrl,
      alt: "Скидка 50% на кадастровые услуги",
      href: promo2Href,
      label: "Скидка 50% на кадастровые услуги",
      position: "left",
    },
  ]

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 lg:grid-cols-2">
          {slides.map((slide) => (
            <Link
              key={slide.src}
              href={slide.href}
              className="group relative overflow-hidden rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.08)] transition-transform duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_35px_80px_rgba(0,0,0,0.12)]"
            >
              <div className="relative aspect-[3776/2240]">
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  fill
                  className={`object-cover transition-transform duration-300 group-hover:scale-[1.02] ${
                    slide.position === "left" ? "object-left" : "object-center"
                  }`}
                  priority={false}
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
