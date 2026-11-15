
 // Card container plus an optional header with title, subtitle and action button.
export default function Card({ children, className = '' }) {
  return (
    <section
      className={`rounded-2xl border border-border bg-surface-raised shadow-lg shadow-black/10 ${className}`}
    >
      {children}
    </section>
  )
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-5">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-sm text-text-muted">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  )
}
