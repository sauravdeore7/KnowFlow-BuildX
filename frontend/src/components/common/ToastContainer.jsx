
 // Pop-up messages in the bottom-right corner. Trigger them with showToast() from useApp().
import { useApp } from '../../hooks/useApp'
import Icon from './Icon'

const TONES = {
  success: 'border-emerald-500/25 bg-surface-raised text-emerald-300',
  error: 'border-red-500/25 bg-surface-raised text-red-300',
  info: 'border-sky-500/25 bg-surface-raised text-sky-300',
}

export default function ToastContainer() {
  const { toasts, dismissToast } = useApp()

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3
            text-sm shadow-xl shadow-black/30 ${TONES[toast.type] ?? TONES.info}`}
        >
          <span className="flex-1">{toast.message}</span>

          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss message"
            className="shrink-0 text-text-muted transition hover:text-text-primary"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
