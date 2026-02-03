"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function VKCallbackContent() {
    const searchParams = useSearchParams()
    const code = searchParams.get("code")
    const error = searchParams.get("error")
    const errorDescription = searchParams.get("error_description")

    return (
        <div className="p-10 font-mono">
            <h1 className="text-2xl font-bold mb-4">VK Authorization Callback</h1>

            {code && (
                <div className="bg-green-100 p-4 border border-green-500 rounded">
                    <p className="font-bold text-green-800">SUCCESS! Copy this code:</p>
                    <div className="mt-2 bg-white p-2 rounded border break-all select-all">
                        {code}
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-red-100 p-4 border border-red-500 rounded">
                    <p className="font-bold text-red-800">ERROR:</p>
                    <p className="text-red-700">{error}</p>
                    <p className="text-red-600 text-sm">{errorDescription}</p>
                </div>
            )}

            {!code && !error && (
                <p>No code or error received. Check URL parameters.</p>
            )}
        </div>
    )
}

export default function VKCallbackPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <VKCallbackContent />
        </Suspense>
    )
}
