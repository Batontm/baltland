/**
 * Сервис определения района Калининградской области
 * 
 * ПРИОРИТЕТ:
 * 1. Кадастровый префикс (основной источник истины)
 * 2. Координаты через Yandex Geocoder (fallback для спорных случаев)
 */

/**
 * Таблица соответствия кадастровых префиксов районам
 * Источник: Росреестр
 */
export const CADASTRAL_PREFIX_TO_DISTRICT: Record<string, string> = {
    "39:01": "Багратионовский район",
    "39:02": "Гвардейский район",
    "39:03": "Гурьевский городской округ",
    "39:04": "Гусевский городской округ",
    "39:05": "Зеленоградский район",
    "39:06": "Краснознаменский городской округ",
    "39:07": "Неманский городской округ",
    "39:08": "Нестеровский район",
    "39:09": "Озерский городской округ",
    "39:10": "Полесский район",
    "39:11": "Правдинский район",
    "39:12": "Славский район",
    "39:13": "Советский городской округ",
    "39:14": "Черняховский городской округ",
    "39:15": "Калининград",
    "39:16": "Балтийский городской округ",
    "39:17": "Светлогорский городской округ",
    "39:18": "Пионерский городской округ",
    "39:19": "Светловский городской округ",
    "39:20": "Ладушкинский городской округ",
    "39:21": "Мамоновский городской округ",
    "39:22": "Янтарный городской округ",
}

// Нормализация названий районов для обратного геокодирования
const DISTRICT_NAME_MAPPING: Record<string, string> = {
    "Янтарный городской округ": "Янтарный городской округ",
    "городской округ Янтарный": "Янтарный городской округ",
    "Янтарный": "Янтарный городской округ",

    "Зеленоградский район": "Зеленоградский район",
    "Зеленоградский городской округ": "Зеленоградский район",

    "Гурьевский городской округ": "Гурьевский городской округ",
    "Гурьевский район": "Гурьевский городской округ",

    "Светлогорский городской округ": "Светлогорский городской округ",
    "Светлогорский район": "Светлогорский городской округ",

    "Светловский городской округ": "Светловский городской округ",
    "Светлый городской округ": "Светловский городской округ",

    "Пионерский городской округ": "Пионерский городской округ",

    "Балтийский городской округ": "Балтийский городской округ",
    "Балтийский район": "Балтийский городской округ",

    "Багратионовский район": "Багратионовский район",

    "Гвардейский район": "Гвардейский район",

    "Гусевский городской округ": "Гусевский городской округ",

    "Краснознаменский городской округ": "Краснознаменский городской округ",

    "Ладушкинский городской округ": "Ладушкинский городской округ",

    "Мамоновский городской округ": "Мамоновский городской округ",

    "Неманский городской округ": "Неманский городской округ",

    "Нестеровский район": "Нестеровский район",

    "Озерский городской округ": "Озерский городской округ",

    "Полесский район": "Полесский район",

    "Правдинский район": "Правдинский район",

    "Славский район": "Славский район",

    "Советский городской округ": "Советский городской округ",

    "Черняховский городской округ": "Черняховский городской округ",

    "Калининград": "Калининград",
    "городской округ Калининград": "Калининград",
    "город Калининград": "Калининград",
}

/**
 * Извлекает кадастровый префикс из номера
 * @param cadastralNumber Кадастровый номер (например, "39:22:010005:852")
 * @returns Префикс (например, "39:22") или null
 */
export function getCadastralPrefix(cadastralNumber: string | null): string | null {
    if (!cadastralNumber) return null
    const match = cadastralNumber.match(/^(\d+:\d+)/)
    return match ? match[1] : null
}

/**
 * Определяет район по кадастровому префиксу (ОСНОВНОЙ МЕТОД)
 * @param cadastralNumber Кадастровый номер
 * @returns Название района или null
 */
export function detectDistrictByCadastralPrefix(cadastralNumber: string | null): string | null {
    const prefix = getCadastralPrefix(cadastralNumber)
    if (!prefix) return null
    return CADASTRAL_PREFIX_TO_DISTRICT[prefix] || null
}

interface YandexGeocoderResponse {
    response: {
        GeoObjectCollection: {
            featureMember: Array<{
                GeoObject: {
                    metaDataProperty: {
                        GeocoderMetaData: {
                            Address: {
                                Components: Array<{
                                    kind: string
                                    name: string
                                }>
                            }
                        }
                    }
                }
            }>
        }
    }
}

/**
 * Определяет район по координатам через Yandex Geocoder (FALLBACK)
 * Используется только если кадастровый префикс не дал результата
 * @param lat Широта
 * @param lon Долгота
 * @returns Название района или null
 */
export async function detectDistrictByCoordinates(
    lat: number,
    lon: number
): Promise<string | null> {
    const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY

    if (!apiKey) {
        console.warn("[detectDistrictByCoordinates] Yandex Maps API key not configured")
        return null
    }

    try {
        const url = `https://geocode-maps.yandex.ru/1.x/?geocode=${lon},${lat}&kind=district&results=3&format=json&apikey=${apiKey}`

        const response = await fetch(url, {
            headers: { "Accept": "application/json" },
        })

        if (!response.ok) {
            console.error(`[detectDistrictByCoordinates] Yandex API error: ${response.status}`)
            return null
        }

        const data = await response.json() as YandexGeocoderResponse
        const members = data?.response?.GeoObjectCollection?.featureMember ?? []

        for (const member of members) {
            const components = member?.GeoObject?.metaDataProperty?.GeocoderMetaData?.Address?.Components ?? []

            for (const component of components) {
                if (component.kind === "district" || component.kind === "area") {
                    const rawName = component.name
                    const normalized = DISTRICT_NAME_MAPPING[rawName]
                    if (normalized) return normalized

                    for (const [key, value] of Object.entries(DISTRICT_NAME_MAPPING)) {
                        if (rawName.includes(key) || key.includes(rawName)) {
                            return value
                        }
                    }

                    return rawName
                }
            }
        }

        return null
    } catch (error) {
        console.error("[detectDistrictByCoordinates] Error:", error)
        return null
    }
}

/**
 * Определяет район для участка (комбинированный метод)
 * 
 * ПРИОРИТЕТ:
 * 1. Кадастровый префикс (основной источник)
 * 2. Координаты (fallback если префикс не сработал)
 * 
 * @param cadastralNumber Кадастровый номер
 * @param lat Широта (опционально)
 * @param lon Долгота (опционально)
 * @returns Название района или null
 */
export async function detectDistrict(
    cadastralNumber: string | null,
    lat?: number | null,
    lon?: number | null
): Promise<string | null> {
    // 1. Пробуем по кадастровому префиксу (основной метод)
    const districtByPrefix = detectDistrictByCadastralPrefix(cadastralNumber)
    if (districtByPrefix) {
        return districtByPrefix
    }

    // 2. Fallback на координаты
    if (lat != null && lon != null) {
        console.log(`[detectDistrict] Prefix not found for ${cadastralNumber}, trying coordinates`)
        return await detectDistrictByCoordinates(lat, lon)
    }

    return null
}

/**
 * Нормализует название района
 */
export function normalizeDistrictName(name: string): string {
    return DISTRICT_NAME_MAPPING[name] ?? name
}
