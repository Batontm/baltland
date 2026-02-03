"use client"

import { useMemo, useState } from "react"
import { calculateROI, formatPrice } from "./home-block-formatters"

export interface RoiInvestmentType {
  name: string
  growthRate: number
}

export interface ROICalculatorConfig {
  title?: string
  subtitle?: string
  min_price?: number
  max_price?: number
  step?: number
  initial_price?: number
  years_options?: number[]
  investment_types?: RoiInvestmentType[]
}

export function ROICalculator({ config }: { config?: ROICalculatorConfig | null }) {
  const investmentTypes: RoiInvestmentType[] =
    config?.investment_types && config.investment_types.length > 0
      ? config.investment_types
      : [
          { name: "Под строительство дома", growthRate: 0.2 },
          { name: "Инвестиционный участок", growthRate: 0.15 },
        ]

  const minPrice = typeof config?.min_price === "number" ? config.min_price : 500000
  const maxPrice = typeof config?.max_price === "number" ? config.max_price : 3000000
  const step = typeof config?.step === "number" ? config.step : 100000

  const [price, setPrice] = useState(typeof config?.initial_price === "number" ? config.initial_price : 950000)
  const [years, setYears] = useState(3)
  const [investmentType, setInvestmentType] = useState(0)

  const yearsOptions = config?.years_options && config.years_options.length > 0 ? config.years_options : [2, 3, 5, 10]

  const result = useMemo(() => {
    const type = investmentTypes[Math.min(Math.max(investmentType, 0), investmentTypes.length - 1)]
    return calculateROI(price, years, type.growthRate)
  }, [price, years, investmentType, investmentTypes])

  const title = config?.title || "📈 Инвестируйте в землю у моря"

  return (
    <div className="bg-white py-8 px-4 rounded-2xl shadow-lg border-l-4 border-primary">
      <h3 className="text-xl font-bold mb-1 text-gray-900">{title}</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Стоимость участка</label>
          <input
            type="range"
            min={minPrice}
            max={maxPrice}
            step={step}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="text-right text-primary font-bold mt-2">{formatPrice(price)}</div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Срок владения</label>
          <div className="grid grid-cols-4 gap-2">
            {yearsOptions.map((y) => (
              <button
                key={y}
                onClick={() => setYears(y)}
                className={`py-1.5 px-3 rounded-lg text-sm font-medium transition-all border-2 ${
                  years === y
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white text-gray-700 border-gray-300 hover:border-primary"
                }`}
              >
                {y} лет
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Тип участка</label>
          <div className="space-y-2">
            {investmentTypes.map((type, idx) => (
              <button
                key={type.name}
                onClick={() => setInvestmentType(idx)}
                className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-all text-left border-2 flex justify-between items-center ${
                  investmentType === idx
                    ? "bg-primary/10 text-foreground border-primary"
                    : "bg-white text-gray-700 border-gray-300 hover:border-primary/60"
                }`}
              >
                <span>{type.name}</span>
                <span className={`font-bold ${investmentType === idx ? "text-primary" : "text-gray-500"}`}>
                  +{(type.growthRate * 100).toFixed(0)}%
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-primary/10 border-l-4 border-primary rounded-lg">
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wide">Текущая цена</p>
            <p className="text-xl font-bold text-gray-900">{formatPrice(price)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wide">Через {years} лет</p>
            <p className="text-xl font-bold text-primary">{formatPrice(result.futurePrice)}</p>
          </div>
        </div>

        <div className="border-t-2 border-primary/20 pt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wide">Ваша прибыль</p>
            <p className="text-xl font-bold text-primary">+{formatPrice(result.profit)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wide">Рентабельность</p>
            <p className="text-xl font-bold text-primary">
              {result.percentage}% за {years} лет
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
