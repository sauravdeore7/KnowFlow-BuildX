
 // Coloured pill. StatusBadge picks the label and colour from data/statusConfig.js.
import { HANDOVER_STATUS, PROJECT_STATUS } from '../../data/statusConfig'

const TONES = {
  success: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/25',
  warning: 'bg-amber-500/15 text-amber-300 ring-amber-400/25',
  info: 'bg-sky-500/15 text-sky-300 ring-sky-400/25',
  neutral: 'bg-slate-500/15 text-slate-300 ring-slate-400/25',
  danger: 'bg-red-500/15 text-red-300 ring-red-400/25',
}

export default function Badge({ tone = 'neutral', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs
        font-medium ring-1 ring-inset ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

// type is "project" or "handover"; value is the status key, e.g. "under_review".
export function StatusBadge({ type = 'project', value }) {
  const config = type === 'project' ? PROJECT_STATUS : HANDOVER_STATUS
  const entry = config[value] ?? { label: value, tone: 'neutral' }
  return <Badge tone={entry.tone}>{entry.label}</Badge>
}
