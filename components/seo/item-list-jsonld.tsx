interface ItemListItem {
    name: string
    url: string
    position: number
    image?: string
}

interface ItemListJsonLdProps {
    items: ItemListItem[]
}

export function ItemListJsonLd({ items }: ItemListJsonLdProps) {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        itemListElement: items.map((item) => ({
            "@type": "ListItem",
            position: item.position,
            url: item.url,
            name: item.name,
            image: item.image,
        })),
    }

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    )
}
