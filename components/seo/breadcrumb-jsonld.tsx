/**
 * JSON-LD BreadcrumbList schema for Yandex SEO
 * https://yandex.ru/support/webmaster/ru/supported-schemas/navigation-links.html
 */

export interface BreadcrumbItem {
    name: string
    url: string
}

interface BreadcrumbJsonLdProps {
    items: BreadcrumbItem[]
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            item: item.url,
        })),
    }

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    )
}
