import { TreePine, Phone, Mail, MapPin } from "lucide-react"
import Link from "next/link"

export function Footer() {
  return (
    <footer className="bg-foreground text-background py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <TreePine className="h-8 w-8 text-primary-foreground" />
              <span className="font-serif text-xl font-semibold">БалтикЗемля</span>
            </Link>
            <p className="text-background/70 text-sm leading-relaxed">
              Продажа земельных участков в Калининградской области с 2015 года. Более 500 довольных клиентов.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Навигация</h4>
            <ul className="space-y-3">
              <li>
                <Link href="#benefits" className="text-background/70 hover:text-background transition-colors text-sm">
                  Преимущества
                </Link>
              </li>
              <li>
                <Link href="#catalog" className="text-background/70 hover:text-background transition-colors text-sm">
                  Каталог участков
                </Link>
              </li>
              <li>
                <Link href="#about" className="text-background/70 hover:text-background transition-colors text-sm">
                  О регионе
                </Link>
              </li>
              <li>
                <Link href="#contact" className="text-background/70 hover:text-background transition-colors text-sm">
                  Контакты
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Локации</h4>
            <ul className="space-y-3">
              <li className="text-background/70 text-sm">Зеленоградск</li>
              <li className="text-background/70 text-sm">Светлогорск</li>
              <li className="text-background/70 text-sm">Янтарный</li>
              <li className="text-background/70 text-sm">Пионерский</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Контакты</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-background/70 text-sm">
                <Phone className="h-4 w-4" />
                +7 931 605-44-84
              </li>
              <li className="flex items-center gap-2 text-background/70 text-sm">
                <Mail className="h-4 w-4" />
                info@baltland.ru
              </li>
              <li className="flex items-center gap-2 text-background/70 text-sm">
                <MapPin className="h-4 w-4" />
                Калининградская обл, Калининград, ул. Брамса, 40
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-background/20 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-background/50 text-sm">© 2025 БалтикЗемля. Все права защищены.</p>
          <div className="flex items-center gap-6">
            <Link href="#" className="text-background/50 hover:text-background transition-colors text-sm">
              Политика конфиденциальности
            </Link>
            <Link href="#" className="text-background/50 hover:text-background transition-colors text-sm">
              Публичная оферта
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
