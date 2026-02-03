const { createClient } = require("@supabase/supabase-js")
const fs = require("fs")
const path = require("path")

// Manually parse .env.local (dotenv is not guaranteed to be installed)
const envPath = path.join(__dirname, "..", ".env.local")
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8")
  envContent.split("\n").forEach((line) => {
    const trimmed = String(line || "").trim()
    if (!trimmed || trimmed.startsWith("#")) return
    const match = trimmed.match(/^([^=]+)=(.*)$/)
    if (!match) return
    const key = match[1].trim()
    let val = match[2]
    // Strip optional surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (key && process.env[key] === undefined) process.env[key] = val
  })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

function convert3857To4326(x, y) {
  const lon = (x * 180) / 20037508.34
  let lat = (y * 180) / 20037508.34
  lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2)
  return [lat, lon]
}

function calculateCentroid3857(geometry) {
  if (!geometry || !geometry.coordinates) return null

  if (geometry.type === "Point") {
    return [geometry.coordinates[0], geometry.coordinates[1]]
  }

  if (geometry.type === "Polygon") {
    const ring = geometry.coordinates[0]
    if (!Array.isArray(ring) || ring.length === 0) return null

    let sumX = 0
    let sumY = 0
    let count = 0

    for (const pt of ring) {
      if (Array.isArray(pt) && pt.length >= 2) {
        sumX += pt[0]
        sumY += pt[1]
        count++
      }
    }

    if (count > 0) return [sumX / count, sumY / count]
  }

  if (geometry.type === "MultiPolygon") {
    const ring = geometry.coordinates?.[0]?.[0]
    if (!Array.isArray(ring) || ring.length === 0) return null

    let sumX = 0
    let sumY = 0
    let count = 0

    for (const pt of ring) {
      if (Array.isArray(pt) && pt.length >= 2) {
        sumX += pt[0]
        sumY += pt[1]
        count++
      }
    }

    if (count > 0) return [sumX / count, sumY / count]
  }

  return null
}

async function exportPlotCoordinates() {
  const { data: plots, error } = await supabase
    .from("land_plots")
    .select("id, cadastral_number, center_lat, center_lon, has_coordinates, coordinates_json")
    .order("cadastral_number", { ascending: true })

  if (error) {
    console.error("Supabase error:", error)
    process.exit(1)
  }

  const rows = (plots || [])
    .filter((p) => p.cadastral_number)
    .map((p) => {
      let lat = typeof p.center_lat === "number" ? p.center_lat : null
      let lon = typeof p.center_lon === "number" ? p.center_lon : null

      if ((lat === null || lon === null) && p.coordinates_json) {
        const centroid3857 = calculateCentroid3857(p.coordinates_json)
        if (centroid3857) {
          const [cLat, cLon] = convert3857To4326(centroid3857[0], centroid3857[1])
          lat = cLat
          lon = cLon
        }
      }

      return {
        cadastral_number: p.cadastral_number,
        x: lon,
        y: lat,
        has_coordinates: !!p.has_coordinates,
      }
    })

  const payload = {
    exported_at: new Date().toISOString(),
    total: rows.length,
    rows,
  }

  const outPath = process.argv[2] || "land-plots-coordinates.json"
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8")
  console.log(`Saved ${rows.length} rows to ${outPath}`)
}

exportPlotCoordinates().catch((e) => {
  console.error(e)
  process.exit(1)
})
