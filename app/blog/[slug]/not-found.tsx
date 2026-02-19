import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, BookOpen } from "lucide-react"
import { Header } from "@/components/calming/header"
import { Footer } from "@/components/calming/footer"

export default function BlogNotFound() {
    return (
        <main className="min-h-screen bg-background">
            <Header />
            <div className="container mx-auto px-4 py-32 text-center">
                <div className="flex justify-center mb-6">
                    <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center">
                        <BookOpen className="h-10 w-10 text-primary" />
                    </div>
                </div>
                <h1 className="text-3xl font-bold mb-4">Статья не найдена</h1>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                    К сожалению, запрашиваемая статья не существует или была удалена.
                </p>
                <Link href="/blog">
                    <Button size="lg" className="rounded-2xl">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Все статьи
                    </Button>
                </Link>
            </div>
            <Footer />
        </main>
    )
}
