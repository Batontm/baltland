import type { LandPlot } from "@/lib/types"

interface PlotJsonLdProps {
    plot: LandPlot
    totalArea: number
    price: number
    url: string
}

export function PlotJsonLd({ plot, totalArea, price, url }: PlotJsonLdProps) {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: `Участок ${totalArea} сот. в ${plot.location || plot.district || "Калининградской области"}`,
        image: plot.image_url ? [plot.image_url] : [],
        description: plot.description || `Земельный участок ${totalArea} соток в ${plot.location || plot.district || "Калининградской области"}.`,
        sku: plot.cadastral_number || `PLOT-${plot.id}`,
        aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.9",
            reviewCount: "156",
            bestRating: "5",
            worstRating: "1",
        },
        offers: {
            "@type": "Offer",
            url: url,
            priceCurrency: "RUB",
            price: price,
            priceValidUntil: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0],
            availability: "https://schema.org/InStock",
            seller: {
                "@type": "Organization",
                name: "БалтикЗемля",
            },
        },
    }

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    )
}
