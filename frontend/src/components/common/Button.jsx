
 // Reusable button. variant: primary | secondary | ghost | danger. size: sm | md | lg.
import Spinner from './Spinner'

const VARIANTS = {
  primary:
    'bg-brand-600 text-white shadow-lg shadow-violet-950/20 hover:bg-brand-700 focus-visible:outline-violet-500',
  secondary:
    'border border-border bg-surface-raised text-text-primary hover:bg-surface-hover ' +
    'focus-visible:outline-violet-500',
  ghost:
    'text-text-secondary hover:bg-surface-hover hover:text-text-primary focus-visible:outline-violet-500',
  danger:
    'border border-red-500/30 bg-red-500/15 text-red-300 hover:bg-red-500/25 focus-visible:outline-red-400',
}

const SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-5 py-3 text-base',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  className = '',
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold
        transition focus-visible:outline-2 focus-visible:outline-offset-2
        disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]}
        ${className}`}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  )
}
