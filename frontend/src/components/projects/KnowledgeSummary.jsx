
// Shows extracted knowledge for a project: counts plus evidence-linked items.
import { KNOWLEDGE_TYPES } from '../../data/statusConfig'
import Badge from '../common/Badge'

const TONES = {
  completed: 'success',
  pending: 'warning',
  decision: 'info',
  blocker: 'danger',
  question: 'neutral',
}

function formatSource(source) {
  if (!source) return null

  // Support existing string-based sources.
  if (typeof source === 'string') return source

  // Format structured journal source references.
  if (typeof source === 'object') {
    const sourceType = source.source_type
      ? source.source_type.replace(/_/g, ' ')
      : 'Source'

    const field = source.field
      ? source.field.replace(/_/g, ' ')
      : ''

    const date = source.entry_date
      ? new Date(source.entry_date).toLocaleDateString()
      : ''

    return [sourceType, field, date]
      .filter(Boolean)
      .join(' · ')
  }

  return String(source)
}

export default function KnowledgeSummary({ knowledge }) {
  const items = Array.isArray(knowledge?.items)
    ? knowledge.items
    : []

  const counts = Object.keys(KNOWLEDGE_TYPES).map((type) => ({
    type,
    label: KNOWLEDGE_TYPES[type],
    count: items.filter((item) => item.type === type).length,
  }))

  return (
    <div className="space-y-5 p-6">
      <p className="text-sm text-text-secondary">
        {knowledge?.summary || 'No knowledge summary available.'}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {counts.map((entry) => (
          <div
            key={entry.type}
            className="rounded-xl border border-border bg-surface px-3 py-3 text-center"
          >
            <p className="text-2xl font-bold text-text-primary">
              {entry.count}
            </p>
            <p className="text-xs text-text-muted">{entry.label}</p>
          </div>
        ))}
      </div>

      {items.length > 0 ? (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {items.map((item, index) => {
            const source = formatSource(item.source)

            return (
              <li
                key={item.id || `${item.type}-${index}`}
                className="flex flex-wrap items-start gap-3 px-4 py-3"
              >
                <Badge tone={TONES[item.type] || 'neutral'}>
                  {KNOWLEDGE_TYPES[item.type] || item.type || 'Other'}
                </Badge>

                <p className="min-w-0 flex-1 text-sm text-text-secondary">
                  {typeof item.text === 'string'
                    ? item.text
                    : 'Knowledge item'}
                </p>

                {source ? (
                  <span className="rounded-md border border-border bg-surface px-2 py-0.5 text-xs font-semibold text-text-secondary">
                    [{source}]
                  </span>
                ) : (
                  <span className="rounded-md border border-amber-400/20 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-300">
                    No source
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="rounded-xl border border-border bg-surface p-4 text-sm text-text-muted">
          No extracted knowledge items available yet.
        </p>
      )}

      <p className="text-xs text-text-muted">
        Sample (synthetic) extraction. Real AI extraction with source links arrives in Part 2.
      </p>
    </div>
  )
}
