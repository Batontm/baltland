export function formatPrice(price: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

export function formatPriceShort(price: number): string {
  if (price >= 1000000) {
    return `${(price / 1000000).toFixed(1)}M`
  }
  if (price >= 1000) {
    return `${(price / 1000).toFixed(0)}K`
  }
  return price.toString()
}

export function calculateROI(
  initialPrice: number,
  years: number,
  growthRate: number,
): { futurePrice: number; profit: number; percentage: number } {
  const futurePrice = initialPrice * Math.pow(1 + growthRate, years)
  const profit = futurePrice - initialPrice
  const percentage = ((profit / initialPrice) * 100).toFixed(0)

  return {
    futurePrice: Math.round(futurePrice),
    profit: Math.round(profit),
    percentage: parseInt(percentage),
  }
}
