import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center">
      <div className="container mx-auto px-4 text-center max-w-2xl">
        <h1 className="text-6xl font-serif font-medium mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-4">Новость не найдена</h2>
        <p className="text-muted-foreground mb-8">К сожалению, запрашиваемая новость не существует или была удалена.</p>
        <Link href="/">
          <Button size="lg" className="rounded-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Вернуться на главную
          </Button>
        </Link>
      </div>
    </main>
  )
}
