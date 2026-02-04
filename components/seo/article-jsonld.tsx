interface ArticleProps {
    title: string
    description: string
    image: string | null
    datePublished: string | null
    dateModified: string
    authorName: string
    publisherName: string
    publisherLogo: string | null
    url: string
}

export function NewsArticleJsonLd({
    title,
    description,
    image,
    datePublished,
    dateModified,
    authorName,
    publisherName,
    publisherLogo,
    url
}: ArticleProps) {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        headline: title,
        description: description,
        image: image ? [image] : [],
        datePublished: datePublished,
        dateModified: dateModified || datePublished,
        author: [{
            "@type": "Person",
            name: authorName,
        }],
        publisher: {
            "@type": "Organization",
            name: publisherName,
            logo: publisherLogo ? {
                "@type": "ImageObject",
                url: publisherLogo
            } : undefined
        },
        mainEntityOfPage: {
            "@type": "WebPage",
            "@id": url
        }
    }

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    )
}
