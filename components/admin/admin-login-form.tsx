"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TreePine, Loader2 } from "lucide-react"

export function AdminLoginForm() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [otpToken, setOtpToken] = useState<string | null>(null)
  const [linkCode, setLinkCode] = useState<string | null>(null)
  const [step, setStep] = useState<"credentials" | "otp" | "link">("credentials")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (step === "otp") {
      const code = otpCode.trim()
      if (!otpToken || !code) {
        setError("Введите код")
        return
      }

      setIsLoading(true)
      try {
        const response = await fetch("/api/admin/login/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ otp_token: otpToken, code }),
          credentials: "include",
        })

        const result = await response.json()
        if (!result.success) {
          setError(result.error || "Неверный код")
          setIsLoading(false)
          return
        }

        window.location.href = result.redirect || "/admin"
      } catch (err) {
        console.error("[v0] OTP verify error:", err)
        setError("Произошла ошибка при проверке кода")
        setIsLoading(false)
      }

      return
    }

    const trimmedUsername = username.trim()
    const trimmedPassword = password.trim()
    if (!trimmedUsername || !trimmedPassword) {
      setError("Введите логин и пароль")
      return
    }

    setIsLoading(true)

    console.log("[v0] Form submitted with username:", trimmedUsername)

    try {
      console.log("[v0] Sending login request...")
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmedUsername, password: trimmedPassword }),
        credentials: "include",
      })

      console.log("[v0] Response status:", response.status)
      const result = await response.json()
      console.log("[v0] Response data:", result)

      if (result?.requires_link) {
        setLinkCode(String(result.link_code || "").trim() || null)
        setStep("link")
        setIsLoading(false)
        return
      }

      if (result?.requires_otp) {
        setOtpToken(String(result.otp_token || "").trim() || null)
        setStep("otp")
        setOtpCode("")
        setIsLoading(false)
        return
      }

      if (!result.success) {
        console.log("[v0] Login failed:", result.error)
        setError(result.error || "Неверный логин или пароль")
        setIsLoading(false)
        return
      }

      console.log("[v0] Login successful, redirecting to:", result.redirect)
      window.location.href = result.redirect || "/admin"
    } catch (err) {
      console.error("[v0] Login error:", err)
      setError("Произошла ошибка при входе")
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="space-y-3 text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/90 to-primary flex items-center justify-center shadow-lg shadow-primary/20">
          <TreePine className="h-7 w-7 text-primary-foreground" />
        </div>
        <div>
          <CardTitle className="text-2xl font-serif">Вход в админ-панель</CardTitle>
          <CardDescription className="mt-2">БалтикЗемля</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {step === "credentials" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="username">Логин</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="rounded-xl"
                />
              </div>
            </>
          )}

          {step === "otp" && (
            <>
              <div className="text-sm text-muted-foreground">
                Введите 6-значный код, который пришёл в Telegram.
              </div>
              <div className="space-y-2">
                <Label htmlFor="otp">Код из Telegram</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  disabled={isLoading}
                  className="rounded-xl"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl"
                disabled={isLoading}
                onClick={() => {
                  setStep("credentials")
                  setOtpToken(null)
                  setOtpCode("")
                  setError("")
                }}
              >
                Назад
              </Button>
            </>
          )}

          {step === "link" && (
            <>
              <div className="text-sm text-muted-foreground space-y-2">
                <div>Telegram ещё не привязан к этому аккаунту.</div>
                <div>
                  Напишите нашему боту команду:
                </div>
                <div className="font-mono bg-muted px-3 py-2 rounded-xl">/start {linkCode || "XXXX"}</div>
                <div>После привязки вернитесь сюда и нажмите «Продолжить».</div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl"
                disabled={isLoading}
                onClick={() => {
                  setStep("credentials")
                  setLinkCode(null)
                  setError("")
                }}
              >
                Продолжить
              </Button>
            </>
          )}
          {error && <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-xl">{error}</div>}
          <Button type="submit" className="w-full rounded-xl" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {step === "otp" ? "Проверка..." : "Вход..."}
              </>
            ) : (
              step === "otp" ? "Подтвердить" : "Войти"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
