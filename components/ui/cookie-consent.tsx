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
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-xl">
            <div className="bg-white/70 backdrop-blur-xl border border-white/50 shadow-lg shadow-black/5 text-slate-700 px-5 py-3 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <p className="text-sm text-slate-600 leading-snug flex-1">
                    Мы используем файлы cookie.{' '}
                    <Link
                        href="/cookies"
                        className="text-slate-800 font-medium hover:text-emerald-600 transition-colors underline underline-offset-2 decoration-slate-300"
                    >
                        Соглашение об использовании
                    </Link>
                </p>
                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        onClick={acceptCookies}
                        className="bg-emerald-500 text-white hover:bg-emerald-600 px-5 py-2 h-auto rounded-xl text-sm font-medium transition-all active:scale-95 whitespace-nowrap shadow-sm"
                    >
                        Принять
                    </Button>
                    <button
                        onClick={() => setIsVisible(false)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                        aria-label="Закрыть"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
