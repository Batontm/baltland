import { Header } from "@/components/calming/header"
import { Footer } from "@/components/calming/footer"
import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Договор публичной оферты",
    description: "Условия договора публичной оферты на покупку земельных участков через сайт БалтикЗемля. Права и обязанности сторон.",
    alternates: {
        canonical: "https://baltland.ru/terms",
    },
}

export default function TermsOfService() {
    return (
        <main className="min-h-screen bg-background text-foreground">
            <Header />
            <div className="container mx-auto px-4 py-16 md:py-24 max-w-4xl">
                <h1 className="text-4xl md:text-5xl font-serif font-medium mb-12">Договор публичной оферты</h1>

                <div className="prose prose-slate max-w-none space-y-8 text-muted-foreground leading-relaxed">
                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">1. Предмет договора</h2>
                        <p>
                            Настоящий Договор является официальным предложением (публичной офертой) Администрации сайта (далее — «Продавец») для любого физического или юридического лица (далее — «Покупатель»), которое примет настоящее предложение на указанных ниже условиях.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">2. Момент заключения договора</h2>
                        <p>
                            Текст данного Договора является публичной офертой в соответствии со статьей 435 и частью 2 статьи 437 Гражданского кодекса РФ. Акцептом оферты (принятием условий договора) является совершение Покупателем действий по бронированию или покупке объектов, представленных на сайте.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">3. Права и обязанности сторон</h2>
                        <div className="space-y-4">
                            <p><strong>Продавец обязуется:</strong></p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Предоставлять достоверную информацию о земельных участках;</li>
                                <li>Обеспечивать конфиденциальность данных Покупателя в соответствии с Политикой конфиденциальности.</li>
                            </ul>
                            <p><strong>Покупатель обязуется:</strong></p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Ознакомиться с условиями настоящего договора и следовать им;</li>
                                <li>Предоставлять достоверные контактные данные для обратной связи.</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">4. Стоимость и порядок оплаты</h2>
                        <p>
                            Цены на земельные участки указаны на Сайте и могут быть изменены Продавцом в одностороннем порядке до момента заключения основного договора купли-продажи. Окончательная стоимость и порядок оплаты фиксируются в индивидуальном договоре купли-продажи.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">5. Ответственность сторон</h2>
                        <p>
                            За неисполнение или ненадлежащее исполнение обязательств по настоящему Договору стороны несут ответственность в соответствии с действующим законодательством Российской Федерации.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">6. Прочие условия</h2>
                        <p>
                            Все споры и разногласия, возникающие при исполнении сторонами обязательств по настоящему Договору, решаются путем переговоров. В случае невозможности их устранения, стороны имеют право обратиться за судебной защитой своих интересов.
                        </p>
                        <p className="mt-4 italic">
                            Внимание: Данный документ является типовым шаблоном. Для официального использования рекомендуется юридическая проверка и внесение реквизитов компании.
                        </p>
                    </section>
                </div>
            </div>
            <Footer />
        </main>
    )
}
