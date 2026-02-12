"use client"

import dynamic from "next/dynamic"

const FloatingChat = dynamic(
  () => import("@/components/chat/floating-chat").then(m => m.FloatingChat),
  { ssr: false }
)
const FloatingPhone = dynamic(
  () => import("@/components/ui/floating-phone").then(m => m.FloatingPhone),
  { ssr: false }
)
const YandexMetrika = dynamic(
  () => import("@/components/analytics/yandex-metrika").then(m => m.YandexMetrika),
  { ssr: false }
)
const TopMailRu = dynamic(
  () => import("@/components/analytics/top-mail-ru").then(m => m.TopMailRu),
  { ssr: false }
)
const CookieConsent = dynamic(
  () => import("@/components/ui/cookie-consent").then(m => m.CookieConsent),
  { ssr: false }
)

export function LazyWidgets() {
  return (
    <>
      <FloatingPhone />
      <FloatingChat />
      <YandexMetrika />
      <TopMailRu />
      <CookieConsent />
    </>
  )
}
