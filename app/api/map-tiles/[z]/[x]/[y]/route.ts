import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ z: string; x: string; y: string }> }
) {
    const { z, x, y } = await params;
    const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'BalticLand/1.0 (info@baltland.ru)',
                'Referer': 'https://baltland.ru'
            }
        });

        if (!response.ok) {
            // If OSM fails, we could try a fallback here
            return new NextResponse("Tile not found", { status: 404 });
        }

        const blob = await response.arrayBuffer();

        return new NextResponse(blob, {
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
            },
        });
    } catch (error) {
        return new NextResponse("Error fetching tile", { status: 500 });
    }
}
