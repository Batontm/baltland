"use client"

import { useEffect, useMemo, useState } from "react"

interface FilterState {
  budget: string | null
  distance: string | null
  amenities: string[]
}

export interface ProgressiveDisclosureConfig {
  title?: string
  subtitle?: string
  cta_label?: string
  initial_participant_count?: number
  budget_options?: string[]
  distance_options?: string[]
  amenities_options?: string[]
}

export function ProgressiveDisclosure({ config }: { config?: ProgressiveDisclosureConfig | null }) {
  const budgetOptions = useMemo(
    () =>
      config?.budget_options && config.budget_options.length > 0
        ? config.budget_options
        : ["До 500K", "500K-1M", "1M-2M", ">2M"],
    [config?.budget_options],
  )

  const distanceOptions = useMemo(
    () =>
      config?.distance_options && config.distance_options.length > 0
        ? config.distance_options
        : ["<15км", "15-25км", "25-40км", "40+км"],
    [config?.distance_options],
  )

  const amenitiesOptions = useMemo(
    () =>
      config?.amenities_options && config.amenities_options.length > 0
        ? config.amenities_options
        : ["Свет", "Газ", "Вода", "Лес рядом", "Магазины", "Тихое место"],
    [config?.amenities_options],
  )

  const [filters, setFilters] = useState<FilterState>({
    budget: null,
    distance: null,
    amenities: [],
  })

  const [participantCount, setParticipantCount] = useState(
    typeof config?.initial_participant_count === "number" ? config.initial_participant_count : 47,
  )

  const title = config?.title || "🎯 Подберу участок за 30 секунд"
  const ctaLabel = config?.cta_label || "🔍 Показать подборку"

  const handleBudgetSelect = (budget: string) => {
    setFilters({ ...filters, budget })
  }

  const handleDistanceSelect = (distance: string) => {
    setFilters({ ...filters, distance })
  }

  const handleAmenitiesToggle = (amenity: string) => {
    const newAmenities = filters.amenities.includes(amenity)
      ? filters.amenities.filter((a) => a !== amenity)
      : [...filters.amenities, amenity]
    setFilters({ ...filters, amenities: newAmenities })
  }

  useEffect(() => {
    const handler = (e: any) => {
      const count = Number(e?.detail?.count)
      if (!Number.isFinite(count)) return
      setParticipantCount(count)
    }
    window.addEventListener("rkkland:pdCount", handler as any)
    return () => window.removeEventListener("rkkland:pdCount", handler as any)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("rkkland:pdPreview", {
          detail: {
            budget: filters.budget,
            distance: filters.distance,
            amenities: filters.amenities,
          },
        }),
      )
    }, 150)
    return () => clearTimeout(t)
  }, [filters.amenities, filters.budget, filters.distance])

  return (
    <div className="bg-gradient-to-b from-white to-blue-50 py-8 px-4 rounded-2xl shadow-lg">
      <h3 className="text-xl font-bold mb-1 text-gray-900">{title}</h3>

      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-800 mb-3">Ваш бюджет?</label>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-2">
          {budgetOptions.map((option) => (
            <button
              key={option}
              onClick={() => handleBudgetSelect(option)}
              className={`py-1.5 px-3 rounded-full text-sm font-medium transition-all duration-300 border-2 ${
                filters.budget === option
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-white text-gray-700 border-gray-300 hover:border-primary"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-800 mb-3">Комфортно ехать?</label>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-2">
          {distanceOptions.map((option) => (
            <button
              key={option}
              onClick={() => handleDistanceSelect(option)}
              className={`py-1.5 px-3 rounded-full text-sm font-medium transition-all duration-300 border-2 ${
                filters.distance === option
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-white text-gray-700 border-gray-300 hover:border-primary"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-800 mb-3">Что важно?</label>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-2">
          {amenitiesOptions.map((amenity) => (
            <button
              key={amenity}
              onClick={() => handleAmenitiesToggle(amenity)}
              className={`py-1.5 px-3 rounded-full text-sm font-medium transition-all duration-300 border-2 ${
                filters.amenities.includes(amenity)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-white text-gray-700 border-gray-300 hover:border-primary"
              }`}
            >
              {amenity}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={() => {
            window.dispatchEvent(
              new CustomEvent("rkkland:pdOpen", {
                detail: {
                  budget: filters.budget,
                  distance: filters.distance,
                  amenities: filters.amenities,
                },
              }),
            )
          }}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-6 rounded-full transition-all duration-300 transform hover:scale-[1.02] shadow-lg text-base"
        >
          {ctaLabel} ({participantCount})
        </button>
      </div>
    </div>
  )
}
