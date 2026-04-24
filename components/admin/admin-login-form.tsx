"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TreePine, Loader2, Mail } from "lucide-react"

export function AdminLoginForm({ initialError }: { initialError?: string }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [step, setStep] = useState<"credentials" | "magic_link">("credentials")
  const [error, setError] = useState(initialError || "")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (step === "magic_link") return

    const trimmedUsername = username.trim()
    const trimmedPassword = password.trim()
    if (!trimmedUsername || !trimmedPassword) {
      setError("Введите логин и пароль")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmedUsername, password: trimmedPassword }),
        credentials: "include",
      })

      const result = await response.json()

      if (result?.requires_magic_link) {
        setStep("magic_link")
        setIsLoading(false)
        return
      }

      if (!result.success) {
        setError(result.error || "Неверный логин или пароль")
        setIsLoading(false)
        return
      }

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

          {step === "magic_link" && (
            <div className="text-center space-y-4 py-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-7 w-7 text-primary" />
              </div>
              <div className="space-y-2">
                <div className="text-base font-medium">Проверьте почту</div>
                <div className="text-sm text-muted-foreground">
                  Ссылка для входа отправлена на вашу электронную почту. Нажмите на неё для входа в админку.
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Ссылка действительна 10 минут
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl"
                onClick={() => {
                  setStep("credentials")
                  setError("")
                }}
              >
                Назад к входу
              </Button>
            </div>
          )}

          {error && <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-xl">{error}</div>}
          {step === "credentials" && (
            <Button type="submit" className="w-full rounded-xl" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Вход...
                </>
              ) : (
                "Войти"
              )}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
