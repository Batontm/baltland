'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CookieConsent() {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const consent = localStorage.getItem('cookie-consent')
        if (!consent) {
            // Small delay to make it feel more organic
            const timer = setTimeout(() => setIsVisible(true), 1500)
            return () => clearTimeout(timer)
        }
    }, [])

    const acceptCookies = () => {
        localStorage.setItem('cookie-consent', 'true')
        setIsVisible(false)
    }

    if (!isVisible) return null

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-2xl">
            <div className="bg-black/80 backdrop-blur-md border border-white/10 text-white p-4 md:p-6 rounded-2xl shadow-2xl flex flex-col md:flex-row items-center gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <p className="text-sm md:text-base text-center md:text-left text-white/90 leading-snug">
                    Мы используем файлы cookie.{' '}
                    <Link
                        href="/cookies"
                        className="text-white font-medium hover:text-white/80 transition-colors underline underline-offset-4 decoration-white/30"
                    >
                        Соглашение об использовании
                    </Link>
                </p>
                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        onClick={acceptCookies}
                        className="bg-white text-black hover:bg-white/90 px-6 py-2 rounded-xl font-medium transition-all active:scale-95 whitespace-nowrap"
                    >
                        Принять
                    </Button>
                    <button
                        onClick={() => setIsVisible(false)}
                        className="p-2 text-white/40 hover:text-white transition-colors"
                        aria-label="Закрыть"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    )
}
