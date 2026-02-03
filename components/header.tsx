"use client"

import { useState } from "react"
import { TreePine, Menu, X } from "lucide-react"
import Link from "next/link"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link href="/" className="flex items-center gap-2">
            <TreePine className="h-8 w-8 text-primary" />
            <span className="font-serif text-xl font-semibold text-foreground">БалтикЗемля</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="#benefits" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Преимущества
            </Link>
            <Link href="#catalog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Каталог
            </Link>
            <Link href="#about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              О регионе
            </Link>
            <Link href="#contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Контакты
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <span className="text-sm text-muted-foreground">+7 931 605-44-84</span>
          </div>

          <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu">
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <nav className="flex flex-col gap-4">
              <Link href="#benefits" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Преимущества
              </Link>
              <Link href="#catalog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Каталог
              </Link>
              <Link href="#about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                О регионе
              </Link>
              <Link href="#contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Контакты
              </Link>
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-3">+7 931 605-44-84</p>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
