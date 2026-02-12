import type { LandPlot } from "@/lib/types"

interface PlotJsonLdProps {
    plot: LandPlot
    totalArea: number
    price: number
    url: string
}

export function PlotJsonLd({ plot, totalArea, price, url }: PlotJsonLdProps) {
    const locationName = plot.location || plot.district || "Калининградская область"
    const plainDescription = (plot.description || "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 300)

    const jsonLd: Record<string, any> = {
        "@context": "https://schema.org",
        "@type": "RealEstateListing",
        name: `Участок ${totalArea} сот. в ${locationName}`,
        url,
        description: plainDescription || `Земельный участок ${totalArea} соток в ${locationName}.`,
        datePosted: plot.created_at || undefined,
        image: plot.image_url ? [plot.image_url] : undefined,
        about: {
            "@type": "Product",
            name: `Земельный участок ${totalArea} сот.`,
            sku: plot.cadastral_number || `PLOT-${plot.int_id || plot.id}`,
            category: plot.land_status || "ИЖС",
            offers: {
                "@type": "Offer",
                url,
                priceCurrency: "RUB",
                price: price > 0 ? price : undefined,
                priceValidUntil: new Date(new Date().getFullYear(), 11, 31).toISOString().split("T")[0],
                availability: "https://schema.org/InStock",
                seller: {
                    "@type": "RealEstateAgent",
                    name: "БалтикЗемля",
                    url: "https://baltland.ru",
                },
            },
            additionalProperty: [
                {
                    "@type": "PropertyValue",
                    name: "Площадь",
                    value: `${totalArea} соток`,
                    unitCode: "ARE",
                },
                ...(plot.land_status ? [{
                    "@type": "PropertyValue",
                    name: "Статус земли",
                    value: plot.land_status,
                }] : []),
                ...(plot.cadastral_number ? [{
                    "@type": "PropertyValue",
                    name: "Кадастровый номер",
                    value: plot.cadastral_number,
                }] : []),
                ...(plot.has_electricity ? [{
                    "@type": "PropertyValue",
                    name: "Электричество",
                    value: "Есть",
                }] : []),
                ...(plot.has_gas ? [{
                    "@type": "PropertyValue",
                    name: "Газ",
                    value: "Есть",
                }] : []),
                ...(plot.has_water ? [{
                    "@type": "PropertyValue",
                    name: "Вода",
                    value: "Есть",
                }] : []),
            ],
        },
    }

    // Add geo coordinates if available
    if (plot.center_lat && plot.center_lon) {
        jsonLd.contentLocation = {
            "@type": "Place",
            name: locationName,
            address: {
                "@type": "PostalAddress",
                addressLocality: plot.location || undefined,
                addressRegion: "Калининградская область",
                addressCountry: "RU",
            },
            geo: {
                "@type": "GeoCoordinates",
                latitude: plot.center_lat,
                longitude: plot.center_lon,
            },
        }
    }

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    )
}
