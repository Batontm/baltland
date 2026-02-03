"use client"

import { ProgressiveDisclosure, type ProgressiveDisclosureConfig } from "./home-block-progressive-disclosure"
import { ROICalculator, type ROICalculatorConfig } from "./home-block-roi-calculator"
import { FAQBlock, type FAQBlockConfig } from "./home-block-faq"

export interface HomeNewBlockConfig {
  progressive_disclosure?: ProgressiveDisclosureConfig | null
  roi_calculator?: ROICalculatorConfig | null
  faq?: FAQBlockConfig | null
}

export function HomeNewBlock({ config }: { config?: HomeNewBlockConfig | null }) {
  return (
    <section id="home-new-block" className="py-10 md:py-14 bg-gradient-to-b from-secondary/15 to-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ProgressiveDisclosure config={config?.progressive_disclosure || null} />
          <ROICalculator config={config?.roi_calculator || null} />
          <FAQBlock config={config?.faq || null} />
        </div>
      </div>
    </section>
  )
}
