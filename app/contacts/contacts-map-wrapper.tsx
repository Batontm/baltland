"use client"

import dynamic from "next/dynamic"

const ContactsMap = dynamic(
    () => import("@/components/map/contacts-map").then((mod) => mod.ContactsMap),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-full min-h-[400px] bg-slate-100 rounded-2xl flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Загрузка карты...</p>
                </div>
            </div>
        ),
    }
)

interface ContactsMapWrapperProps {
    lat: number
    lon: number
    address: string
}

export function ContactsMapWrapper({ lat, lon, address }: ContactsMapWrapperProps) {
    return <ContactsMap lat={lat} lon={lon} address={address} />
}
