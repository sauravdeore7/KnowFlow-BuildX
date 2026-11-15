
import Card from './Card'

export default function StatCard({
  label,
  value,
  hint,
  loading = false,
  onClick,
}) {
  const content = (
    <>
      <p className="text-sm font-semibold text-text-secondary">{label}</p>

      {loading ? (
        <div className="mt-3 h-9 w-16 animate-pulse rounded-lg bg-surface-hover" />
      ) : (
        <p className="mt-2 text-4xl font-bold tracking-tight text-text-primary">
          {String(value).padStart(2, '0')}
        </p>
      )}

      <p className="mt-2 text-sm text-text-muted">{hint}</p>

      {onClick && (
        <p className="mt-4 text-xs font-semibold text-violet-400">
          View details →
        </p>
      )}
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="w-full rounded-2xl border border-border bg-surface-raised p-6 text-left
          shadow-sm transition-all duration-200
          hover:-translate-y-1 hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-950/20
          focus-visible:outline-none focus-visible:ring-2
          focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas
          disabled:cursor-not-allowed"
      >
        {content}
      </button>
    )
  }

  return <Card className="p-6">{content}</Card>
}
