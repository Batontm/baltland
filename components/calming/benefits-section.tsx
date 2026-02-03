"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import type { LandingBenefitItem, LandingBenefitsSection } from "@/lib/types"
import {
  Flame,
  Zap,
  Waves,
  FileCheck,
  CreditCard,
  TreePine,
  Shield,
  TrendingUp,
  LucideIcon,
} from "lucide-react"

const LUCIDE_ICON_MAP: Record<string, LucideIcon> = {
  Flame,
  Zap,
  Waves,
  FileCheck,
  CreditCard,
  TreePine,
  Shield,
  TrendingUp,
}

interface BenefitsSectionProps {
  section: LandingBenefitsSection | null
  items: LandingBenefitItem[]
}

function clampTwoLines(text: string) {
  return text
}

function BigImageCard(props: {
  imageUrl: string | null
  title: string
  description: string
  buttonText: string
  buttonUrl: string
}) {
  const { imageUrl, title, description, buttonText, buttonUrl } = props

  const isExternal = /^https?:\/\//i.test(buttonUrl)

  return (
    <div className="relative overflow-hidden rounded-3xl min-h-[420px] lg:min-h-0 lg:h-full shadow-sm">
      {imageUrl ? (
        <Image src={imageUrl} alt={title} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 33vw" />
      ) : (
        <div className="absolute inset-0 bg-muted" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
      <div className="absolute inset-0 p-6 flex flex-col justify-end gap-3">
        <div className="text-white">
          <div className="text-2xl font-serif font-medium">{title}</div>
          <div className="mt-2 text-sm text-white/90 leading-relaxed">{description}</div>
        </div>
        {buttonText && buttonUrl ? (
          <Button asChild className="w-fit rounded-xl">
            {isExternal ? (
              <a href={buttonUrl} target="_blank" rel="noopener noreferrer">
                {buttonText}
              </a>
            ) : (
              <Link href={buttonUrl}>{buttonText}</Link>
            )}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export function BenefitsSection({ section, items }: BenefitsSectionProps) {
  if (!section || !section.is_active) return null

  const centerItems = (items || []).slice(0, 6)

  return (
    <section id="benefits" className="py-20 md:py-28 bg-gradient-to-b from-secondary/15 to-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-medium mb-3 text-balance">
            {section.title}
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground">{section.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr_1.2fr] gap-6 items-stretch">
          <BigImageCard
            imageUrl={section.left_image_url}
            title={section.left_title}
            description={section.left_description}
            buttonText={section.left_button_text}
            buttonUrl={section.left_button_url}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:h-full">
            {centerItems.map((item) => {
              const Icon = item.icon_type === "lucide" && item.icon_name ? LUCIDE_ICON_MAP[item.icon_name] : null

              return (
                <div key={item.id} className="p-4 rounded-2xl bg-card/80 border border-border/40 shadow-sm">
                  <div className={`w-11 h-11 rounded-xl ${item.color_class} flex items-center justify-center mb-3`}>
                    {item.icon_type === "image" && item.icon_url ? (
                      <Image src={item.icon_url} alt="" width={22} height={22} className="object-contain" />
                    ) : Icon ? (
                      <Icon className="h-5 w-5" />
                    ) : (
                      <TreePine className="h-5 w-5" />
                    )}
                  </div>

                  <div className="text-sm font-semibold leading-snug">{item.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {clampTwoLines(item.description)}
                  </div>
                </div>
              )
            })}
          </div>

          <BigImageCard
            imageUrl={section.right_image_url}
            title={section.right_title}
            description={section.right_description}
            buttonText={section.right_button_text}
            buttonUrl={section.right_button_url}
          />
        </div>
      </div>
    </section>
  )
}
