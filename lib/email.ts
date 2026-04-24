import nodemailer from 'nodemailer'

const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || ''
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || SMTP_USER

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASSWORD,
  },
})

/**
 * Отправляет magic link на email администратора
 */
export async function sendMagicLinkEmail(token: string): Promise<void> {
  if (!SMTP_USER || !SMTP_PASSWORD) {
    console.error('[Email] SMTP_USER или SMTP_PASSWORD не заданы')
    throw new Error('Email не настроен')
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://baltland.ru'
  const magicUrl = `${baseUrl}/api/admin/login/magic?token=${encodeURIComponent(token)}`

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
      <h2 style="color: #16a34a; margin-bottom: 8px;">🔐 Вход в админку БалтЛанд</h2>
      <p style="color: #374151; font-size: 16px; line-height: 1.5;">
        Нажмите кнопку ниже для входа в панель управления:
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${magicUrl}"
           style="display: inline-block; background-color: #16a34a; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">
          Войти в админку
        </a>
      </div>
      <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">
        Ссылка действительна 10 минут.<br>
        Если вы не запрашивали вход — просто проигнорируйте это письмо.
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">
        baltland.ru — Земельные участки в Калининградской области
      </p>
    </div>
  `

  await transporter.sendMail({
    from: `"БалтЛанд" <${SMTP_USER}>`,
    to: ADMIN_EMAIL,
    subject: '🔐 Вход в админку БалтЛанд',
    html,
  })

  console.log(`[Email] Magic link отправлен на ${ADMIN_EMAIL}`)
}
