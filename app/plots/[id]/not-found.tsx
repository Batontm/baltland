import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="space-y-2">
          <h1 className="text-6xl font-serif font-semibold">404</h1>
          <h2 className="text-2xl font-semibold">Участок не найден</h2>
          <p className="text-muted-foreground">К сожалению, этот участок больше не доступен или был удален.</p>
        </div>
        <Button asChild className="rounded-xl">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Вернуться на главную
          </Link>
        </Button>
      </div>
    </div>
  )
}
