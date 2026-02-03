"use server"

import * as net from "net"

/**
 * Tests if a proxy is working by making a TCP connection to it
 */
export async function testProxyConnection(proxyUrl: string): Promise<{ success: boolean; message: string; responseTime?: number }> {
    const startTime = Date.now()

    try {
        if (!proxyUrl || !proxyUrl.trim()) {
            return { success: false, message: "Прокси не указан" }
        }

        // Parse proxy URL
        let host: string
        let port: number

        const trimmed = proxyUrl.trim()

        // Check if has auth (login:password@host:port)
        if (trimmed.includes("@")) {
            const atIndex = trimmed.lastIndexOf("@")
            const hostPart = trimmed.slice(atIndex + 1)
            const [h, p] = hostPart.split(":")
            host = h
            port = parseInt(p, 10)
        } else {
            // Simple format (host:port)
            const [h, p] = trimmed.split(":")
            host = h
            port = parseInt(p, 10)
        }

        if (!host || !port || isNaN(port)) {
            return { success: false, message: "Неверный формат прокси. Используйте host:port или login:password@host:port" }
        }

        // Test TCP connection to the proxy
        return new Promise((resolve) => {
            const socket = net.createConnection({ host, port, timeout: 5000 }, () => {
                const responseTime = Date.now() - startTime
                socket.destroy()
                resolve({ success: true, message: `Прокси доступен (${responseTime}ms)`, responseTime })
            })

            socket.on("error", (err: Error) => {
                socket.destroy()
                resolve({ success: false, message: `Ошибка подключения: ${err.message}` })
            })

            socket.on("timeout", () => {
                socket.destroy()
                resolve({ success: false, message: "Таймаут подключения (5s)" })
            })
        })

    } catch (err: any) {
        return { success: false, message: `Ошибка: ${err.message || String(err)}` }
    }
}
