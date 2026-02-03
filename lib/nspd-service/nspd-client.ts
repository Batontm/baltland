import { NspdSearchResponse, CadastralObject } from "./schemas";
import { HttpsProxyAgent } from "https-proxy-agent";
import https from "https";

// Create a custom https agent that ignores SSL errors (for NSPD self-signed certs)
const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

export class NspdClient {
    private baseUrl = "https://nspd.gov.ru/api/geoportal/v2/search/geoportal";
    private proxy: string | null = null;
    private proxyAgent: HttpsProxyAgent<string> | null = null;

    constructor(options: { proxy?: string | null } = {}) {
        this.proxy = options.proxy || process.env.NSPD_PROXY || null;

        // Create proxy agent if proxy is configured
        if (this.proxy) {
            try {
                // Handle different proxy formats
                let proxyUrl = this.proxy.trim();

                // Advanced format: host:port:user:pass
                const parts = proxyUrl.split(":");
                if (parts.length === 4 && !proxyUrl.includes("@")) {
                    const [host, port, user, pass] = parts;
                    proxyUrl = `http://${user}:${pass}@${host}:${port}`;
                }

                // If proxy has auth (user:pass@host:port), convert to URL format
                if (proxyUrl.includes("@")) {
                    if (!proxyUrl.startsWith("http://") && !proxyUrl.startsWith("https://")) {
                        proxyUrl = `http://${proxyUrl}`;
                    }
                } else {
                    // Simple host:port format
                    if (!proxyUrl.startsWith("http://") && !proxyUrl.startsWith("https://")) {
                        proxyUrl = `http://${proxyUrl}`;
                    }
                }

                // Create proxy agent with SSL bypass
                this.proxyAgent = new HttpsProxyAgent(proxyUrl, {
                    rejectUnauthorized: false
                });
                console.log(`[NspdClient] Proxy configured: ${proxyUrl.replace(/:[^:@]+@/, ':***@')}`);
            } catch (err) {
                console.error(`[NspdClient] Failed to create proxy agent:`, err);
            }
        }
    }

    /**
     * Fetches information about a land plot by its cadastral number.
     */
    async getObjectInfo(
        cadastralNumber: string,
        coordsOrder: "lat,lon" | "lon,lat" = "lat,lon"
    ): Promise<{ data: CadastralObject | null; error?: string }> {
        const url = `${this.baseUrl}?query=${encodeURIComponent(cadastralNumber)}`;

        const headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
            "Accept": "*/*",
            "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
            "Referer": "https://nspd.gov.ru/map?thematic=PKK&zoom=16&active_layers=36049",
            "Origin": "https://nspd.gov.ru",
            "Sec-Ch-Ua": '"Not(A:Brand";v="8", "Chromium";v="132", "Google Chrome";v="132"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
            "DNT": "1",
            "Priority": "u=1, i",
        };

        try {
            let response: Response;

            // Always use node-fetch with proper agent for SSL bypass
            const nodeFetch = await import("node-fetch").then(m => m.default).catch(() => null);

            if (nodeFetch) {
                // Use proxy agent if configured, otherwise use httpsAgent for SSL bypass
                const agent = this.proxyAgent || httpsAgent;
                response = await nodeFetch(url, {
                    method: "GET",
                    headers,
                    agent,
                }) as unknown as Response;
            } else {
                // Fallback to native fetch (may fail on self-signed certs)
                console.warn("[NspdClient] node-fetch not available, SSL errors may occur");
                response = await fetch(url, {
                    method: "GET",
                    headers,
                    // @ts-ignore - Next.js specific cache option
                    next: { revalidate: 3600 }
                });
            }

            if (!response.ok) {
                const errMsg = `API Error: ${response.status} ${response.statusText}`;
                console.error(`[NspdClient] ${errMsg}`);
                return { data: null, error: errMsg };
            }

            const resJson: NspdSearchResponse = await response.json() as NspdSearchResponse;
            const feature = resJson.data?.features?.[0];

            if (!feature || !feature.geometry) {
                return { data: null, error: "Объект не найден в НСПД" };
            }

            const geometry = feature.geometry;
            const centroid = this.calculateCentroid(geometry);

            let centroidWgs84: [number, number] | null = null;
            if (centroid) {
                const [lat, lon] = this.convert3857To4326(centroid[0], centroid[1]);
                centroidWgs84 = coordsOrder === "lat,lon" ? [lat, lon] : [lon, lat];
            }

            return {
                data: {
                    cadastralNumber: feature.properties.cadastral_number || cadastralNumber,
                    address: feature.properties.address || null,
                    geometry: geometry,
                    centroid_wgs84: centroidWgs84,
                    geometry_type: geometry.type,
                    land_category: feature.properties.category_id || undefined,
                    permitted_use: feature.properties.utilization_id || undefined,
                    area: feature.properties.area_value || undefined,
                    area_unit: feature.properties.area_unit || undefined,
                }
            };
        } catch (error: any) {
            const errMsg = error?.cause
                ? `Network error: ${error.cause.message || error.cause.code}`
                : (error?.message || String(error))

            console.error(`[NspdClient] Failed to fetch ${cadastralNumber}. Error: ${errMsg}`);
            return { data: null, error: errMsg };
        }
    }

    /**
     * Converts coordinates from Web Mercator (EPSG:3857) to WGS84 (EPSG:4326).
     */
    private convert3857To4326(x: number, y: number): [number, number] {
        const lon = (x * 180) / 20037508.34;
        let lat = (y * 180) / 20037508.34;
        lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
        return [lat, lon];
    }

    /**
     * Calculates the center point of the geometry.
     */
    private calculateCentroid(geometry: any): [number, number] | null {
        if (!geometry || !geometry.coordinates) return null;

        if (geometry.type === "Point") {
            return [geometry.coordinates[0], geometry.coordinates[1]];
        }

        if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") {
            // For simplicity, take the first ring of the (first) polygon
            const ring = geometry.type === "Polygon"
                ? geometry.coordinates[0]
                : geometry.coordinates[0][0];

            if (!Array.isArray(ring) || ring.length === 0) return null;

            let sumX = 0;
            let sumY = 0;
            let count = 0;

            for (const pt of ring) {
                if (Array.isArray(pt) && pt.length >= 2) {
                    sumX += pt[0];
                    sumY += pt[1];
                    count++;
                }
            }

            if (count > 0) {
                return [sumX / count, sumY / count];
            }
        }

        return null;
    }

    /**
     * Attempts to detect the land status label (ИЖС, СНТ, и т.д.) based on NSPD properties.
     */
    public detectLandStatus(data: CadastralObject): string | null {
        const category = (data.land_category || "").toLowerCase();
        const use = (data.permitted_use || "").toLowerCase();

        // Mapping logic based on common NSPD strings
        if (use.includes("индивидуальное жилищное строительство") || use.includes("ижс")) {
            return "ИЖС";
        }
        if (use.includes("личное подсобное хозяйство") || use.includes("лпх")) {
            return "ЛПХ";
        }
        if (use.includes("садоводство") || use.includes("снт") || use.includes("дачное")) {
            // It's either СНТ or ДНП, usually СНТ is more common for gardening
            if (use.includes("дачное")) return "ДНП";
            return "СНТ";
        }

        // Add more logic if needed based on category
        if (category.includes("населенных пунктов") && !use) {
            return "ИЖС"; // Reasonable default for residential areas
        }

        return null;
    }
}
