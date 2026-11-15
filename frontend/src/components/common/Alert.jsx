
 // Inline message box. tone: error | success | info | warning.
import Icon from './Icon'

const TONES = {
  error: 'border-red-500/25 bg-red-500/10 text-red-300',
  success: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  info: 'border-sky-500/25 bg-sky-500/10 text-sky-300',
  warning: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
}

export default function Alert({ tone = 'info', children, action, className = '' }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${TONES[tone]}
        ${className}`}
    >
      <Icon
        name={tone === 'success' ? 'checkCircle' : 'alert'}
        className="mt-0.5 h-5 w-5 shrink-0"
      />
      <div className="flex-1">{children}</div>
      {action}
    </div>
  )
}
