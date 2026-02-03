
import Link from "next/link"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld"

export interface BreadcrumbItemType {
    label: string
    href: string
}

interface SiteBreadcrumbProps {
    items: BreadcrumbItemType[]
    className?: string
}

export function SiteBreadcrumb({ items, className }: SiteBreadcrumbProps) {
    // Ensure the chain starts with Home
    const fullItems: BreadcrumbItemType[] = [
        { label: "Главная", href: "https://baltland.ru" },
        ...items.map(item => ({
            label: item.label,
            href: item.href.startsWith("http") ? item.href : `https://baltland.ru${item.href}`
        }))
    ]

    return (
        <div className={className}>
            {/* SEO Microdata */}
            <BreadcrumbJsonLd
                items={fullItems.map((item) => ({
                    name: item.label,
                    url: item.href,
                }))}
            />

            {/* Visual Breadcrumb */}
            <Breadcrumb>
                <BreadcrumbList>
                    {fullItems.map((item, index) => {
                        const isLast = index === fullItems.length - 1

                        return (
                            <div key={item.href} className="inline-flex items-center">
                                <BreadcrumbItem>
                                    {isLast ? (
                                        <BreadcrumbPage>{item.label}</BreadcrumbPage>
                                    ) : (
                                        <BreadcrumbLink asChild>
                                            <Link href={item.href.replace("https://baltland.ru", "") || "/"}>{item.label}</Link>
                                        </BreadcrumbLink>
                                    )}
                                </BreadcrumbItem>
                                {!isLast && <BreadcrumbSeparator />}
                            </div>
                        )
                    })}
                </BreadcrumbList>
            </Breadcrumb>
        </div>
    )
}
