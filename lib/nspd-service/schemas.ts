export interface NspdGeometry {
    type: "Point" | "Polygon" | "MultiPolygon" | string;
    coordinates: any[];
    crs?: {
        type: string;
        properties: {
            name: string;
        };
    };
}

export interface NspdFeature {
    type: "Feature";
    id: string;
    geometry: NspdGeometry;
    properties: {
        cadastral_number?: string;
        address?: string;
        area_value?: number;
        area_unit?: string;
        category_id?: string;
        utilization_id?: string;
        [key: string]: any;
    };
}

export interface NspdSearchResponse {
    data: {
        features: NspdFeature[];
        total: number;
        [key: string]: any;
    };
    success: boolean;
    message?: string;
}

export interface CadastralObject {
    cadastralNumber: string;
    address: string | null;
    geometry: NspdGeometry;
    centroid_wgs84: [number, number] | null; // [latitude, longitude]
    geometry_type: string;
    land_category?: string;
    permitted_use?: string;
    area?: number;
    area_unit?: string;
}
