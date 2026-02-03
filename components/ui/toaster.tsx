'use client'

import { useToast } from '@/hooks/use-toast'
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast'

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const hasTitle =
          !!title && !(typeof title === "string" && title.trim() === "")
        const hasDescription =
          !!description && !(typeof description === "string" && description.trim() === "")
        const hasContent = hasTitle || hasDescription || !!action
        const fallbackTitle = props.variant === "destructive" ? "Ошибка" : "Уведомление"

        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {hasTitle ? <ToastTitle>{title}</ToastTitle> : !hasContent ? <ToastTitle>{fallbackTitle}</ToastTitle> : null}
              {hasDescription ? <ToastDescription>{description}</ToastDescription> : null}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
