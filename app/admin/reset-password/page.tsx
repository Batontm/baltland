"use client"

import { useState } from "react"
import { resetAdminPassword } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handleReset = async () => {
    setLoading(true)
    setResult(null)

    const res = await resetAdminPassword()

    if (res.success) {
      setResult(`Пароль успешно сброшен! Новый хеш: ${res.hash}`)
    } else {
      setResult(`Ошибка: ${res.error}`)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Сброс пароля администратора</CardTitle>
          <CardDescription>
            Эта страница генерирует новый bcrypt хеш для пароля "123" и обновляет его в базе данных.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleReset} disabled={loading} className="w-full">
            {loading ? "Сбрасываю пароль..." : "Сбросить пароль на '123'"}
          </Button>

          {result && <div className="p-4 rounded-lg bg-muted text-sm break-all">{result}</div>}

          <div className="text-sm text-muted-foreground">
            После сброса пароля используйте:
            <ul className="list-disc list-inside mt-2">
              <li>
                Логин: <strong>admin</strong>
              </li>
              <li>
                Пароль: <strong>123</strong>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
