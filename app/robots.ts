import { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://baltland.ru"

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/*.css",
          "/*.js",
          "/*.png",
          "/*.jpg",
          "/*.jpeg",
          "/*.webp",
          "/*.svg",
          "/*.gif",
        ],
        disallow: [
          "/api/",
          "/admin/",
          "/staff/",
          "/minimalist/",
          "/luxury/",
          "/plots/",
          "/uchastok/",
          "/*?utm_*",
          "/*?yclid=*",
          "/*?gclid=*",
          "/*?openstat=*",
        ],
      },
    ],
    host: baseUrl,
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
