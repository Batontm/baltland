'use server'

import { notifyNewApplication, notifyCallback, notifyAdminError } from '@/lib/telegram'

/**
 * Server Action: Отправка заявки на участок
 */
export async function submitApplication(formData: FormData) {
    try {
        const name = formData.get('name') as string
        const phone = formData.get('phone') as string
        const plotId = formData.get('plotId') as string
        const plotTitle = formData.get('plotTitle') as string | null

        // Валидация
        if (!name || !phone || !plotId) {
            return { success: false, error: 'Заполните все обязательные поля' }
        }

        // TODO: Сохранение заявки в БД
        // await db.applications.create({ name, phone, plotId, ... })

        // Уведомление в Telegram
        await notifyNewApplication({
            name,
            phone,
            plotId,
            plotTitle: plotTitle || undefined,
        })

        return { success: true }
    } catch (error) {
        // Логируем ошибку админу
        await notifyAdminError(error, 'submitApplication')
        console.error('[submitApplication]', error)
        return { success: false, error: 'Произошла ошибка, попробуйте позже' }
    }
}

/**
 * Server Action: Запрос обратного звонка
 */
export async function requestCallback(formData: FormData) {
    try {
        const phone = formData.get('phone') as string
        const source = formData.get('source') as string | null

        if (!phone) {
            return { success: false, error: 'Укажите номер телефона' }
        }

        // TODO: Сохранение в БД

        // Уведомление в Telegram
        await notifyCallback({
            phone,
            source: source || undefined,
        })

        return { success: true }
    } catch (error) {
        await notifyAdminError(error, 'requestCallback')
        console.error('[requestCallback]', error)
        return { success: false, error: 'Произошла ошибка, попробуйте позже' }
    }
}
