import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, Search, MapPin, HelpCircle, Newspaper } from "lucide-react"
import { Header } from "@/components/calming/header"
import { Footer } from "@/components/calming/footer"

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="text-center space-y-8 max-w-lg">
          <div className="space-y-3">
            <h1 className="text-7xl font-bold text-primary">404</h1>
            <h2 className="text-2xl font-semibold">Страница не найдена</h2>
            <p className="text-muted-foreground">
              Запрашиваемая страница не существует или была перемещена.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            <Button asChild size="lg" className="rounded-full">
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                На главную
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full">
              <Link href="/catalog">
                <Search className="h-4 w-4 mr-2" />
                Каталог участков
              </Link>
            </Button>
          </div>

          <div className="pt-4 border-t border-border/50">
            <p className="text-sm text-muted-foreground mb-4">Возможно, вас заинтересует:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button asChild variant="ghost" size="sm" className="rounded-full">
                <Link href="/catalog/izhs">
                  <MapPin className="h-3.5 w-3.5 mr-1.5" />
                  Участки ИЖС
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="rounded-full">
                <Link href="/catalog/nedorogie">
                  <MapPin className="h-3.5 w-3.5 mr-1.5" />
                  Недорогие участки
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="rounded-full">
                <Link href="/faq">
                  <HelpCircle className="h-3.5 w-3.5 mr-1.5" />
                  Помощь
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="rounded-full">
                <Link href="/">
                  <Newspaper className="h-3.5 w-3.5 mr-1.5" />
                  Новости
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

