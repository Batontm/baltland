"use client"

import { useEffect, useState } from "react"
import { Phone } from "lucide-react"
import { getOrganizationSettings } from "@/app/actions"

export function FloatingPhone() {
    const [phone, setPhone] = useState<string | null>(null)

    useEffect(() => {
        getOrganizationSettings().then((s) => {
            if (s?.phone) setPhone(s.phone)
        })
    }, [])

    if (!phone) return null

    const phoneDigits = phone.replace(/\D/g, "")

    return (
        <a
            href={`tel:+${phoneDigits}`}
            className="fixed bottom-6 left-6 z-50 md:hidden h-16 w-16 rounded-full bg-emerald-600 hover:bg-emerald-700 shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            aria-label="Позвонить"
        >
            <Phone className="h-8 w-8 text-white" />
        </a>
    )
}
