import { Header } from "@/components/calming/header"
import { Footer } from "@/components/calming/footer"
import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Соглашение об использовании файлов cookie | БалтикЗемля",
    description: "Узнайте, как и для чего мы используем файлы cookie на сайте БалтикЗемля.",
    alternates: {
        canonical: "https://baltland.ru/cookies",
    },
}

export default function CookiesPolicy() {
    return (
        <main className="min-h-screen bg-background text-foreground">
            <Header />
            <div className="container mx-auto px-4 py-16 md:py-24 max-w-4xl">
                <h1 className="text-4xl md:text-5xl font-serif font-medium mb-12">Использование файлов cookie</h1>

                <div className="prose prose-slate max-w-none space-y-8 text-muted-foreground leading-relaxed">
                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">Что такое файлы cookie?</h2>
                        <p>
                            Файлы cookie — это небольшие текстовые файлы, которые сохраняются на вашем устройстве (компьютере, смартфоне, планшете) при посещении веб-сайтов. Они широко используются для обеспечения работы сайтов или повышения эффективности их работы, а также для предоставления аналитической информации.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">Как мы используем cookie?</h2>
                        <p>На сайте БалтикЗемля файлы cookie используются для следующих целей:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Технические cookie:</strong> необходимы для корректной работы сайта, например, для запоминания вашего выбора в фильтрах каталога.</li>
                            <li><strong>Аналитические cookie:</strong> помогают нам понять, как пользователи взаимодействуют с сайтом (например, через Яндекс.Метрику), что позволяет нам улучшать структуру и контент.</li>
                            <li><strong>Функциональные cookie:</strong> позволяют сайту запоминать ваши настройки (например, согласие с данной политикой), чтобы не спрашивать вас повторно.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">Как управлять файлами cookie?</h2>
                        <p>
                            Большинство браузеров позволяют вам управлять файлами cookie через настройки. Вы можете заблокировать их установку или удалить уже существующие файлы. Однако, пожалуйста, учтите, что отключение cookie может привести к некорректной работе некоторых функций сайта.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">Согласие на использование</h2>
                        <p>
                            Продолжая пользоваться нашим сайтом, вы соглашаетесь с использованием файлов cookie в соответствии с данным Соглашением. Если вы не согласны, пожалуйста, измените настройки вашего браузера или прекратите использование сайта.
                        </p>
                    </section>
                </div>
            </div>
            <Footer />
        </main>
    )
}
