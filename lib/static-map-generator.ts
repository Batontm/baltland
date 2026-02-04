/**
 * Static Map Image Generator
 * Generates map screenshots with plot polygons using Puppeteer + Leaflet
 */

import puppeteer from "puppeteer"

export interface MapImageOptions {
    geometry: any // GeoJSON Polygon or MultiPolygon
    centerLat?: number
    centerLon?: number
    width?: number
    height?: number
    ownershipType?: "ownership" | "lease" | string | null
    isReserved?: boolean
    mapType?: "satellite" | "scheme"
}

const DEFAULT_WIDTH = 600
const DEFAULT_HEIGHT = 400

// Colors matching the existing map implementation
const COLORS = {
    ownership: "#22c55e", // green
    lease: "#3b82f6",     // blue  
    reserved: "#64748b", // gray
    border: "#dc2626",   // red border for visibility
}

function getPlotColor(ownershipType?: string | null, isReserved?: boolean): string {
    if (isReserved) return COLORS.reserved
    if (String(ownershipType || "").toLowerCase().includes("lease") ||
        String(ownershipType || "").toLowerCase().includes("аренд")) {
        return COLORS.lease
    }
    return COLORS.ownership
}

// Convert EPSG:3857 to EPSG:4326
function convertCoords(coords: any): [number, number] {
    if (!coords || !Array.isArray(coords)) return [0, 0]

    const x = coords[0]
    const y = coords[1]

    if (typeof x !== "number" || typeof y !== "number" || Number.isNaN(x) || Number.isNaN(y)) {
        return [0, 0]
    }

    // Already WGS84
    if (Math.abs(x) <= 180 && Math.abs(y) <= 90) {
        return [y, x] // [lat, lon]
    }
    if (Math.abs(x) <= 90 && Math.abs(y) <= 180) {
        return [x, y]
    }

    // EPSG:3857 -> EPSG:4326
    const lon = (x * 180) / 20037508.34
    let lat = (y * 180) / 20037508.34
    lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2)

    if (Number.isNaN(lat) || Number.isNaN(lon)) return [0, 0]
    return [lat, lon]
}

function convertCoordsArray(coords: any): any {
    if (!coords || !Array.isArray(coords)) return []
    if (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
        return coords.map(convertCoordsArray)
    }
    if (Array.isArray(coords[0]) && typeof coords[0][0] === "number") {
        return coords.map(convertCoords)
    }
    return convertCoords(coords)
}

function parsePolygons(geometry: any): Array<[number, number][]> {
    if (!geometry?.type || !geometry?.coordinates) return []

    const result: Array<[number, number][]> = []

    if (geometry.type === "Polygon") {
        const ring = convertCoordsArray(geometry.coordinates[0]) as [number, number][]
        if (ring.length > 0) result.push(ring)
    } else if (geometry.type === "MultiPolygon") {
        for (const poly of geometry.coordinates) {
            const ring = convertCoordsArray(poly[0]) as [number, number][]
            if (ring.length > 0) result.push(ring)
        }
    }

    return result
}

function calculateBounds(polygons: Array<[number, number][]>): {
    center: [number, number]
    bounds: [[number, number], [number, number]]
} {
    const allPoints = polygons.flat().filter((p) => p[0] !== 0 && p[1] !== 0)

    if (allPoints.length === 0) {
        return {
            center: [54.7104, 20.5101],
            bounds: [
                [54.7, 20.5],
                [54.72, 20.52],
            ],
        }
    }

    const lats = allPoints.map((p) => p[0])
    const lons = allPoints.map((p) => p[1])

    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLon = Math.min(...lons)
    const maxLon = Math.max(...lons)

    return {
        center: [(minLat + maxLat) / 2, (minLon + maxLon) / 2],
        bounds: [
            [minLat, minLon],
            [maxLat, maxLon],
        ],
    }
}

export async function generateStaticMapImage(options: MapImageOptions): Promise<Buffer> {
    const {
        geometry,
        width = DEFAULT_WIDTH,
        height = DEFAULT_HEIGHT,
        ownershipType,
        isReserved,
        mapType = "scheme",
    } = options

    const polygonFillColor = getPlotColor(ownershipType, isReserved)
    const polygonColor = COLORS.border

    const polygons = parsePolygons(geometry)
    if (polygons.length === 0) {
        throw new Error("No valid polygon coordinates found")
    }

    const { center, bounds } = calculateBounds(polygons)

    const tileUrl =
        mapType === "satellite"
            ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            : "https://tile.openstreetmap.org/{z}/{x}/{y}.png"

    // Build Leaflet HTML
    const polygonsJson = JSON.stringify(polygons)
    const boundsJson = JSON.stringify(bounds)

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    #map { width: ${width}px; height: ${height}px; }
    .leaflet-control-attribution { display: none !important; }
    .leaflet-control-zoom { display: none !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const polygons = ${polygonsJson};
    const bounds = ${boundsJson};
    
    const map = L.map('map', {
      zoomControl: false,
      attributionControl: false,
      fadeAnimation: false,
      zoomAnimation: false
    });
    
    L.tileLayer('${tileUrl}', {
      maxZoom: 19
    }).addTo(map);
    
    // Draw polygons
    polygons.forEach(ring => {
      L.polygon(ring, {
        color: '${polygonColor}',
        fillColor: '${polygonFillColor}',
        fillOpacity: 0.4,
        weight: 3
      }).addTo(map);
    });
    
    // Fit bounds with smaller padding for closer zoom
    map.fitBounds(bounds, { padding: [15, 15], maxZoom: 19 });
    
    // Signal ready after tiles load
    map.whenReady(() => {
      setTimeout(() => {
        window.mapReady = true;
      }, 1500); // Wait for tiles to load
    });
  </script>
</body>
</html>
`

    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    })

    try {
        const page = await browser.newPage()
        // Set custom User-Agent to comply with OSM Tile Usage Policy
        await page.setUserAgent("BaltlandMapGenerator/1.0 (https://baltland.ru; info@baltland.ru)")
        await page.setViewport({ width, height })
        await page.setContent(html, { waitUntil: "networkidle0" })

        // Wait for map to be ready
        await page.waitForFunction("window.mapReady === true", { timeout: 15000 })

        // Additional wait for final tile rendering
        await new Promise((resolve) => setTimeout(resolve, 500))

        const screenshot = await page.screenshot({
            type: "png",
            clip: { x: 0, y: 0, width, height },
        })

        return Buffer.from(screenshot)
    } finally {
        await browser.close()
    }
}
