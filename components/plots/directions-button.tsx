"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { Navigation } from "lucide-react"

export function DirectionsButton({ lat, lon, className }: { lat?: number | null; lon?: number | null; className?: string }) {
  const [open, setOpen] = useState(false)
  const [userPos, setUserPos] = useState<{ lat: number; lon: number } | null>(null)
  if (!lat || !lon) return null

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserPos({ lat: pos.coords.latitude, lon: pos.coords.longitude })
          setOpen(true)
        },
        () => {
          setUserPos(null)
          setOpen(true)
        },
        { timeout: 5000 }
      )
    } else {
      setOpen(true)
    }
  }

  const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  const fromLat = userPos?.lat
  const fromLon = userPos?.lon

  const options = isMobile
    ? [
        { label: "Яндекс Навигатор", url: fromLat ? `yandexnavi://build_route_on_map?lat_from=${fromLat}&lon_from=${fromLon}&lat_to=${lat}&lon_to=${lon}` : `yandexnavi://build_route_on_map?lat_to=${lat}&lon_to=${lon}` },
        { label: "Google Maps", url: fromLat ? `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLon}&destination=${lat},${lon}` : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}` },
        { label: "2ГИС", url: fromLat ? `https://2gis.ru/directions/points/${fromLon},${fromLat}|${lon},${lat}` : `https://2gis.ru/directions/points/|${lon},${lat}` },
      ]
    : [
        { label: "Яндекс Карты", url: fromLat ? `https://yandex.ru/maps/?rtext=${fromLat},${fromLon}~${lat},${lon}&rtt=auto` : `https://yandex.ru/maps/?rtext=~${lat},${lon}&rtt=auto` },
        { label: "Google Maps", url: fromLat ? `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLon}&destination=${lat},${lon}` : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}` },
        { label: "2ГИС", url: fromLat ? `https://2gis.ru/directions/points/${fromLon},${fromLat}|${lon},${lat}` : `https://2gis.ru/directions/points/|${lon},${lat}` },
      ]

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-sm font-medium transition-colors ${className || ""}`}
      >
        <Navigation className="h-4 w-4" />
        Как проехать
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-card rounded-2xl shadow-xl p-6 max-w-xs w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">Как проехать?</h3>
            <div className="flex flex-col gap-2">
              {options.map((opt) => (
                <a
                  key={opt.label}
                  href={opt.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-sm font-medium"
                >
                  <Navigation className="h-4 w-4 text-primary" />
                  {opt.label}
                </a>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
