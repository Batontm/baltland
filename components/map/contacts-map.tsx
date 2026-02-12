"use client"

import { useMemo } from "react"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

interface ContactsMapProps {
    lat: number
    lon: number
    address: string
}

export function ContactsMap({ lat, lon, address }: ContactsMapProps) {
    const icon = useMemo(() => L.divIcon({
        className: "custom-marker",
        html: `<div style="
            width: 40px; height: 40px;
            background: #16a34a;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: flex; align-items: center; justify-content: center;
        ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
            </svg>
        </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40],
    }), [])

    return (
        <MapContainer
            center={[lat, lon]}
            zoom={16}
            className="w-full h-full min-h-[400px] rounded-2xl z-0"
            zoomControl={true}
            scrollWheelZoom={false}
            attributionControl={false}
        >
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <Marker position={[lat, lon]} icon={icon}>
                <Popup>
                    <div className="text-sm font-medium">{address}</div>
                </Popup>
            </Marker>
        </MapContainer>
    )
}
