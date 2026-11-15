
import { useMemo, useState } from 'react'
import { useApp } from '../hooks/useApp'
import Card from '../components/common/Card'
import Icon from '../components/common/Icon'

const PERIOD_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last 12 months' },
  { value: 'all', label: 'All time' },
]

const CATEGORY_META = [
  { key: 'completedTasks', label: 'Completed work', color: '#34d399' },
  { key: 'decisions', label: 'Decisions', color: '#a78bfa' },
  { key: 'blockers', label: 'Blockers', color: '#fb7185' },
  { key: 'dependencies', label: 'Dependencies', color: '#fbbf24' },
  { key: 'pendingTasks', label: 'Pending tasks', color: '#60a5fa' },
  { key: 'nextSteps', label: 'Next steps', color: '#22d3ee' },
]

const COLORS = {
  purple: '#a78bfa',
  cyan: '#22d3ee',
  green: '#34d399',
  amber: '#fbbf24',
  red: '#fb7185',
  blue: '#60a5fa',
}

function getArray(value) {
  return Array.isArray(value) ? value : []
}

function getText(value) {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)

  if (value && typeof value === 'object') {
    return (
      value.text ||
      value.title ||
      value.description ||
      value.name ||
      value.task ||
      ''
    ).toString().trim()
  }

  return ''
}

function getCount(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => getText(item)).length
  }

  return getText(value) ? 1 : 0
}

function getDate(value) {
  if (!value) return null

  const date =
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T00:00:00`)
      : new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

function getJournalDate(journal) {
  return (
    journal.date ||
    journal.createdAt ||
    journal.created_at ||
    journal.updatedAt
  )
}

function getHandoverDate(handover) {
  return (
    handover.createdAt ||
    handover.created_at ||
    handover.updatedAt ||
    handover.date
  )
}

function isWithinPeriod(value, period) {
  if (period === 'all') return true

  const date = getDate(value)
  if (!date) return false

  const now = new Date()
  const cutoff = new Date()

  cutoff.setDate(cutoff.getDate() - Number(period))
  cutoff.setHours(0, 0, 0, 0)

  return date >= cutoff && date <= now
}

function normaliseStatus(status) {
  return String(status || '').toLowerCase().replace(/[_-]/g, ' ')
}

function getUserId(user) {
  return String(user?.id || user?.userId || '')
}

function getEmployeeJournals(project, user) {
  const userId = getUserId(user)
  const email = String(user?.email || '').toLowerCase()

  return getArray(project.journalEntries).filter((entry) => {
    const creatorId = String(
      entry.createdById ||
      entry.createdBy?.id ||
      entry.userId ||
      '',
    )

    const creatorEmail = String(
      entry.createdByEmail ||
      entry.createdBy?.email ||
      entry.userEmail ||
      '',
    ).toLowerCase()

    if (userId && creatorId) return creatorId === userId
    if (email && creatorEmail) return creatorEmail === email

    return false
  })
}

function getEmployeeHandovers(project, user) {
  const userId = getUserId(user)
  const email = String(user?.email || '').toLowerCase()

  return getArray(project.handovers).filter((handover) => {
    const participantIds = [
      handover.outgoingEmployeeId,
      handover.incomingEmployeeId,
      handover.employeeId,
      handover.createdById,
      handover.outgoingEmployee?.id,
      handover.incomingEmployee?.id,
    ]
      .filter(Boolean)
      .map(String)

    if (userId && participantIds.includes(userId)) return true

    const participantEmails = [
      handover.outgoingEmployeeEmail,
      handover.incomingEmployeeEmail,
      handover.employeeEmail,
      handover.outgoingEmployee?.email,
      handover.incomingEmployee?.email,
    ]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase())

    return Boolean(email && participantEmails.includes(email))
  })
}

function getProjectMembership(project, user) {
  const email = String(user?.email || '').toLowerCase()
  const userId = getUserId(user)

  return getArray(project.members).some((member) => {
    const memberId = String(
      member.id ||
      member.userId ||
      member.user?.id ||
      '',
    )

    const memberEmail = String(
      member.email ||
      member.user?.email ||
      '',
    ).toLowerCase()

    return (
      (userId && memberId === userId) ||
      (email && memberEmail === email)
    )
  })
}

function getJournalCategoryCounts(journals) {
  return CATEGORY_META.reduce((result, category) => {
    result[category.key] = journals.reduce(
      (total, journal) => total + getCount(journal[category.key]),
      0,
    )

    return result
  }, {})
}

function getHandoverStatuses(handovers) {
  const result = {
    approved: 0,
    pending: 0,
    changesRequested: 0,
  }

  handovers.forEach((handover) => {
    const status = normaliseStatus(handover.status)

    if (
      status.includes('approved') ||
      status.includes('shared') ||
      status.includes('completed')
    ) {
      result.approved += 1
    } else if (
      status.includes('change') ||
      status.includes('revision') ||
      status.includes('rejected')
    ) {
      result.changesRequested += 1
    } else {
      result.pending += 1
    }
  })

  return result
}

function SectionHeader({ number, title, description, action }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-xs font-bold text-violet-300">
          {number}
        </div>

        <div>
          <h2 className="text-lg font-bold tracking-tight text-text-primary">
            {title}
          </h2>
          <p className="mt-1 text-xs leading-5 text-text-muted">
            {description}
          </p>
        </div>
      </div>

      {action}
    </div>
  )
}

function Panel({ children, className = '' }) {
  return (
    <Card className={`min-w-0 overflow-hidden ${className}`}>
      {children}
    </Card>
  )
}

function PanelHeading({ title, description, action }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-bold text-text-primary">{title}</h3>
        {description && (
          <p className="mt-1 text-xs leading-5 text-text-muted">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}

function MetricCard({ label, value, description, icon, tone = 'violet' }) {
  const tones = {
    blue: 'bg-sky-500/10 text-sky-300 ring-sky-500/15',
    green: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/15',
    amber: 'bg-amber-500/10 text-amber-300 ring-amber-500/15',
    red: 'bg-rose-500/10 text-rose-300 ring-rose-500/15',
    violet: 'bg-violet-500/10 text-violet-300 ring-violet-500/15',
  }

  return (
    <Card className="group relative overflow-hidden p-5 transition duration-200 hover:-translate-y-0.5 hover:border-violet-500/30">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-violet-500/[0.04] blur-2xl transition group-hover:bg-violet-500/[0.10]" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-text-muted">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-text-primary">
            {value}
          </p>
        </div>

        <div className={`rounded-xl p-3 ring-1 ${tones[tone] || tones.violet}`}>
          <Icon name={icon} className="h-5 w-5" />
        </div>
      </div>

      <p className="relative mt-3 text-[11px] leading-5 text-text-muted">
        {description}
      </p>
    </Card>
  )
}

function StatusBadge({ label, tone = 'slate' }) {
  const styles = {
    green: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
    amber: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
    red: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
    blue: 'border-sky-500/20 bg-sky-500/10 text-sky-300',
    violet: 'border-violet-500/20 bg-violet-500/10 text-violet-300',
    slate: 'border-border bg-surface-hover text-text-secondary',
  }

  return (
    <span className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold ${styles[tone] || styles.slate}`}>
      {label}
    </span>
  )
}

function EmptyMessage({ children }) {
  return (
    <div className="rounded-xl border border-dashed border-border-strong bg-surface px-5 py-8 text-center text-xs leading-5 text-text-muted">
      {children}
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[11px] font-semibold text-text-muted">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-xs text-text-primary outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function MiniStat({ label, value, tone = 'violet' }) {
  const colors = {
    violet: 'text-violet-300',
    green: 'text-emerald-300',
    amber: 'text-amber-300',
    red: 'text-rose-300',
    blue: 'text-sky-300',
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <p className="text-[10px] font-medium text-text-muted">{label}</p>
      <p className={`mt-1.5 text-xl font-bold ${colors[tone] || colors.violet}`}>
        {value}
      </p>
    </div>
  )
}

function EmptyChart({ title, description }) {
  return (
    <div className="flex min-h-[230px] flex-col items-center justify-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
        <Icon name="chart" className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm font-semibold text-text-secondary">{title}</p>
      <p className="mt-1 max-w-xs text-center text-xs leading-5 text-text-muted">
        {description}
      </p>
    </div>
  )
}

// Activity chart with date-aware buckets and hover tooltips.
function ActivityChart({ journals, period }) {
  const chartData = useMemo(() => {
    const now = new Date()
    let start = new Date(now)

    if (period === 'all') {
      const dates = journals
        .map((journal) => getDate(getJournalDate(journal)))
        .filter(Boolean)
        .sort((a, b) => a - b)

      if (dates.length) {
        start = new Date(dates[0])
      } else {
        start.setDate(start.getDate() - 6)
      }
    } else {
      start.setDate(start.getDate() - Number(period) + 1)
    }

    start.setHours(0, 0, 0, 0)

    const totalDays = Math.max(
      1,
      Math.ceil((now - start) / 86400000) + 1,
    )

    const bucketCount = 7
    const bucketSize = totalDays / bucketCount

    return Array.from({ length: bucketCount }, (_, index) => {
      const bucketStart = new Date(start)
      bucketStart.setDate(
        start.getDate() + Math.floor(index * bucketSize),
      )

      const bucketEnd = new Date(start)
      bucketEnd.setDate(
        start.getDate() + Math.floor((index + 1) * bucketSize),
      )

      const entries = journals.filter((journal) => {
        const date = getDate(getJournalDate(journal))
        return date && date >= bucketStart && date < bucketEnd
      })

      const completed = entries.reduce(
        (total, journal) => total + getCount(journal.completedTasks),
        0,
      )

      return {
        label: bucketStart.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
        }),
        journals: entries.length,
        completed,
        total: entries.length + completed,
      }
    })
  }, [journals, period])

  const maxValue = Math.max(
    1,
    ...chartData.map((item) => Math.max(item.journals, item.completed)),
  )

  if (!journals.length) {
    return (
      <Panel className="p-5">
        <EmptyChart
          title="No activity recorded"
          description="Your journal entries and completed tasks will appear here once recorded."
        />
      </Panel>
    )
  }

  return (
    <Panel className="p-5">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-4">
          <span className="flex items-center gap-2 text-xs text-text-muted">
            <span className="h-2.5 w-2.5 rounded-sm bg-violet-400" />
            Journal entries
          </span>
          <span className="flex items-center gap-2 text-xs text-text-muted">
            <span className="h-2.5 w-2.5 rounded-sm bg-cyan-400" />
            Completed tasks
          </span>
        </div>

        <StatusBadge label="Interactive chart" tone="violet" />
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between pb-8 pl-7">
          {[100, 75, 50, 25, 0].map((value) => (
            <div key={value} className="flex items-center gap-3">
              <span className="w-5 text-[9px] text-text-faint">
                {Math.round((maxValue * value) / 100)}
              </span>
              <div className="h-px flex-1 border-t border-dashed border-border" />
            </div>
          ))}
        </div>

        <div className="relative grid h-64 grid-cols-7 gap-2 pl-7">
          {chartData.map((item, index) => (
            <div
              key={`${item.label}-${index}`}
              className="group relative flex min-w-0 flex-col items-center justify-end"
            >
              <div className="flex h-[calc(100%-30px)] w-full items-end justify-center gap-1">
                <div
                  className="relative w-3 max-w-[42%] rounded-t-md bg-violet-400 transition-all duration-300 group-hover:brightness-125"
                  style={{
                    height: item.journals
                      ? `${Math.max(5, (item.journals / maxValue) * 100)}%`
                      : '2px',
                    minHeight: item.journals ? '5px' : '2px',
                  }}
                />

                <div
                  className="relative w-3 max-w-[42%] rounded-t-md bg-cyan-400 transition-all duration-300 group-hover:brightness-125"
                  style={{
                    height: item.completed
                      ? `${Math.max(5, (item.completed / maxValue) * 100)}%`
                      : '2px',
                    minHeight: item.completed ? '5px' : '2px',
                  }}
                />
              </div>

              <span className="mt-3 whitespace-nowrap text-[9px] text-text-faint">
                {item.label}
              </span>

              <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-20 hidden w-40 -translate-x-1/2 rounded-xl border border-violet-500/20 bg-[#11101d] p-3 text-left shadow-xl group-hover:block group-focus-within:block">
                <p className="mb-2 text-[10px] font-bold text-white">
                  {item.label}
                </p>
                <p className="flex items-center justify-between text-[10px] text-slate-300">
                  Journal entries
                  <strong className="text-violet-300">{item.journals}</strong>
                </p>
                <p className="mt-1 flex items-center justify-between text-[10px] text-slate-300">
                  Completed tasks
                  <strong className="text-cyan-300">{item.completed}</strong>
                </p>
                <p className="mt-2 border-t border-white/10 pt-2 text-[10px] font-semibold text-white">
                  Total: {item.total}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        <p className="text-[10px] text-text-muted">
          Hover over a bar to inspect recorded activity.
        </p>
        <p className="text-[10px] text-text-faint">
          {journals.length} journal records in this selection
        </p>
      </div>
    </Panel>
  )
}

// Project engagement chart with interactive tooltips.
function ProjectEngagementChart({ projects }) {
  const max = Math.max(1, ...projects.map((project) => project.count))

  if (!projects.length) {
    return (
      <Panel className="p-5">
        <EmptyMessage>No assigned projects found.</EmptyMessage>
      </Panel>
    )
  }

  return (
    <Panel className="p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-text-primary">
            Recorded work by project
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Hover over each bar to view its contribution details.
          </p>
        </div>
        <StatusBadge label={`${projects.length} projects`} tone="violet" />
      </div>

      <div className="space-y-5">
        {projects.map((project, index) => (
          <div key={project.id} className="group relative">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-[10px] font-bold text-violet-300">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="truncate text-xs font-semibold text-text-secondary">
                  {project.name}
                </span>
              </div>

              <span className="text-xs font-bold text-text-primary">
                {project.count}
              </span>
            </div>

            <div className="ml-10 h-2.5 overflow-hidden rounded-full bg-surface-hover">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-600 via-violet-400 to-cyan-400 transition-all duration-500 group-hover:brightness-125"
                style={{
                  width: `${(project.count / max) * 100}%`,
                  minWidth: project.count ? '5px' : '0',
                }}
              />
            </div>

            <div className="pointer-events-none absolute bottom-full left-10 z-20 mb-2 hidden rounded-lg border border-violet-500/20 bg-[#11101d] px-3 py-2 shadow-xl group-hover:block">
              <p className="whitespace-nowrap text-[10px] font-semibold text-white">
                {project.name}
              </p>
              <p className="mt-1 whitespace-nowrap text-[10px] text-slate-300">
                {project.count} journal entries
              </p>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  )
}

// Interactive knowledge donut chart.
function KnowledgeDonut({ categories, total }) {
  const [activeCategory, setActiveCategory] = useState(null)

  const active = CATEGORY_META.find(
    (category) => category.key === activeCategory,
  )

  let accumulated = 0

  const segments = CATEGORY_META.map((category) => {
    const count = categories[category.key] || 0
    const percentage = total ? (count / total) * 100 : 0
    const start = accumulated
    accumulated += percentage

    return {
      ...category,
      count,
      percentage,
      start,
      end: accumulated,
    }
  })

  const gradient = segments
    .filter((segment) => segment.percentage > 0)
    .map(
      (segment) =>
        `${segment.color} ${segment.start}% ${segment.end}%`,
    )
    .join(', ')

  return (
    <Panel className="p-5">
      <PanelHeading
        title="Knowledge distribution"
        description="Explore your captured knowledge by category."
      />

      <div className="my-7 flex flex-col items-center">
        <div
          className="relative flex h-48 w-48 items-center justify-center rounded-full transition-all duration-300"
          style={{
            background: total
              ? `conic-gradient(${gradient})`
              : 'conic-gradient(#334155 0% 100%)',
          }}
        >
          <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full bg-surface">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-text-muted">
              Total captured
            </p>
            <p className="mt-1 text-4xl font-bold tracking-tight text-text-primary">
              {active ? active.count : total}
            </p>
            <p className="mt-1 text-[10px] text-text-muted">
              {active ? active.label : 'Knowledge items'}
            </p>
          </div>
        </div>

        <p className="mt-4 text-center text-[10px] text-text-muted">
          Hover over a category below to inspect its contribution.
        </p>
      </div>

      <div className="space-y-2">
        {segments.map((category) => (
          <button
            type="button"
            key={category.key}
            onMouseEnter={() => setActiveCategory(category.key)}
            onMouseLeave={() => setActiveCategory(null)}
            onFocus={() => setActiveCategory(category.key)}
            onBlur={() => setActiveCategory(null)}
            className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition ${
              activeCategory === category.key
                ? 'border-violet-500/30 bg-violet-500/[0.07]'
                : 'border-border bg-surface hover:border-violet-500/20'
            }`}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              <span className="truncate text-xs text-text-secondary">
                {category.label}
              </span>
            </span>

            <span className="flex shrink-0 items-center gap-3">
              <span className="text-[10px] text-text-muted">
                {category.percentage.toFixed(1)}%
              </span>
              <strong className="w-6 text-right text-xs text-text-primary">
                {category.count}
              </strong>
            </span>
          </button>
        ))}
      </div>
    </Panel>
  )
}

function CategoryBreakdown({ categories, total }) {
  return (
    <Panel className="p-5">
      <PanelHeading
        title="Category breakdown"
        description="Knowledge items extracted from your journal entries."
        action={<StatusBadge label={`${total} items`} tone="violet" />}
      />

      <div className="mt-6 space-y-5">
        {CATEGORY_META.map((category) => {
          const count = categories[category.key] || 0
          const percentage = total ? (count / total) * 100 : 0

          return (
            <div key={category.key} className="group">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-xs text-text-secondary">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  {category.label}
                </span>
                <span className="text-xs font-semibold text-text-primary">
                  {count}
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-surface-hover">
                <div
                  className="h-full rounded-full transition-all duration-500 group-hover:brightness-125"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: category.color,
                  }}
                />
              </div>

              <p className="mt-1 text-right text-[9px] text-text-faint">
                {percentage.toFixed(1)}%
              </p>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

function StatusCard({ label, value, color, tone }) {
  return (
    <Card className="p-5 transition hover:-translate-y-0.5 hover:border-violet-500/25">
      <p className="text-xs font-semibold text-text-muted">{label}</p>
      <p className="mt-3 text-3xl font-bold text-text-primary">{value}</p>
      <div
        className="mt-3 h-1 w-10 rounded-full"
        style={{ backgroundColor: color }}
      />
      <p className={`mt-3 text-[10px] ${tone || 'text-text-muted'}`}>
        Handover records
      </p>
    </Card>
  )
}

function downloadCSV(rows, filename) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? '').replace(/"/g, '""')
          return `"${value}"`
        })
        .join(','),
    )
    .join('\n')

  const blob = new Blob([`\uFEFF${csv}`], {
    type: 'text/csv;charset=utf-8;',
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()

  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function EmployeeReportsAnalyticsPage() {
  const {
    user,
    projects = [],
    projectsStatus,
    projectsError,
  } = useApp()

  const [projectFilter, setProjectFilter] = useState('all')
  const [periodFilter, setPeriodFilter] = useState('30')

  const displayName =
    user?.name ||
    user?.fullName ||
    user?.email?.split('@')[0] ||
    'Employee'

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  // Only show projects assigned to this employee.
  const employeeProjects = useMemo(
    () =>
      getArray(projects).filter((project) =>
        getProjectMembership(project, user),
      ),
    [projects, user],
  )

  // Apply project selection.
  const filteredProjects = useMemo(
    () =>
      projectFilter === 'all'
        ? employeeProjects
        : employeeProjects.filter(
            (project) => String(project.id) === String(projectFilter),
          ),
    [employeeProjects, projectFilter],
  )

  // Build employee-specific analytics.
  const reportData = useMemo(() => {
    const allJournals = filteredProjects.flatMap((project) =>
      getEmployeeJournals(project, user).map((journal) => ({
        ...journal,
        projectId: project.id,
        projectName: project.name || 'Untitled project',
      })),
    )

    const journals = allJournals.filter((journal) =>
      isWithinPeriod(getJournalDate(journal), periodFilter),
    )

    const allHandovers = filteredProjects.flatMap((project) =>
      getEmployeeHandovers(project, user).map((handover) => ({
        ...handover,
        projectId: project.id,
        projectName: project.name || 'Untitled project',
      })),
    )

    const handovers = allHandovers.filter((handover) =>
      isWithinPeriod(getHandoverDate(handover), periodFilter),
    )

    const categories = getJournalCategoryCounts(journals)

    const knowledgeTotal = CATEGORY_META.reduce(
      (total, category) => total + categories[category.key],
      0,
    )

    const projectActivity = filteredProjects.map((project) => {
      const projectJournals = journals.filter(
        (journal) => String(journal.projectId) === String(project.id),
      )

      return {
        id: project.id,
        name: project.name || 'Untitled project',
        count: projectJournals.length,
      }
    })

    const involvedProjects = projectActivity.filter(
      (project) => project.count > 0,
    ).length

    const handoverStatuses = getHandoverStatuses(handovers)

    const workSummaries = journals.filter((journal) =>
      getText(journal.workSummary),
    ).length

    return {
      journals,
      handovers,
      categories,
      knowledgeTotal,
      pendingTasks: categories.pendingTasks,
      blockers: categories.blockers,
      dependencies: categories.dependencies,
      projectActivity,
      involvedProjects,
      handoverStatuses,
      workSummaries,
    }
  }, [filteredProjects, user, periodFilter])

  const selectedProjectName =
    projectFilter === 'all'
      ? 'All my projects'
      : employeeProjects.find(
          (project) => String(project.id) === String(projectFilter),
        )?.name || 'Selected project'

  const selectedPeriod =
    PERIOD_OPTIONS.find((option) => option.value === periodFilter)?.label ||
    'Last 30 days'

  const handlePrint = () => {
    window.print()
  }

  const handleExport = () => {
    const rows = [
      ['KnowFlow - Personal Contribution Report'],
      ['Generated', new Date().toLocaleString()],
      ['Employee', displayName],
      ['Project', selectedProjectName],
      ['Reporting period', selectedPeriod],
      [],
      ['Contribution Summary'],
      ['Metric', 'Count'],
      ['Projects involved', reportData.involvedProjects],
      ['Work records', reportData.journals.length],
      ['Knowledge captured', reportData.knowledgeTotal],
      ['Handover participation', reportData.handovers.length],
      [],
      ['Knowledge Categories'],
      ['Category', 'Count'],
      ...CATEGORY_META.map((category) => [
        category.label,
        reportData.categories[category.key],
      ]),
      [],
      ['Project Engagement'],
      ['Project', 'Journal entries'],
      ...reportData.projectActivity.map((project) => [
        project.name,
        project.count,
      ]),
      [],
      ['Handover Participation'],
      ['Status', 'Count'],
      ['Approved', reportData.handoverStatuses.approved],
      ['Pending', reportData.handoverStatuses.pending],
      ['Changes Requested', reportData.handoverStatuses.changesRequested],
      [],
      ['Outstanding Work'],
      ['Category', 'Count'],
      ['Pending tasks', reportData.pendingTasks],
      ['Unresolved blockers', reportData.blockers],
      ['Open dependencies', reportData.dependencies],
      [],
      ['Work Record Register'],
      ['Project', 'Date', 'Work summary', 'Completed work', 'Decisions', 'Blockers', 'Dependencies', 'Pending tasks', 'Next steps'],
      ...reportData.journals.map((journal) => [
        journal.projectName,
        getJournalDate(journal)
          ? new Date(getJournalDate(journal)).toLocaleDateString()
          : '',
        getText(journal.workSummary),
        getText(journal.completedTasks),
        getText(journal.decisions),
        getText(journal.blockers),
        getText(journal.dependencies),
        getText(journal.pendingTasks),
        getText(journal.nextSteps),
      ]),
    ]

    downloadCSV(rows, 'knowflow-personal-contribution-report.csv')
  }

  if (projectsStatus === 'loading') {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <div className="text-center">
          <Icon
            name="loader"
            className="mx-auto h-8 w-8 animate-spin text-violet-300"
          />
          <p className="mt-4 text-sm text-text-muted">
            Loading your reports and analytics...
          </p>
        </div>
      </div>
    )
  }

  if (projectsError) {
    return (
      <Card className="border border-rose-500/25 p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-rose-500/10 p-3 text-rose-300">
            <Icon name="alert-triangle" className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-rose-300">
              Unable to load Reports & Analytics
            </p>
            <p className="mt-1 text-sm text-text-muted">
              {String(projectsError)}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg border border-border px-4 py-2 text-xs font-semibold text-text-secondary transition hover:bg-surface-hover"
            >
              Try again
            </button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="employee-report-page mx-auto w-full max-w-[1600px] space-y-7 pb-10">
      <style>{`
        @media print {
          @page {
            size: auto;
            margin: 14mm;
          }

          body {
            background: white !important;
            color: #111827 !important;
          }

          .employee-report-page {
            background: white !important;
            color: #111827 !important;
            max-width: none !important;
          }

          .employee-report-page * {
            color: #111827 !important;
            border-color: #d1d5db !important;
            box-shadow: none !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .employee-report-page .no-print {
            display: none !important;
          }

          .employee-report-page .print-card {
            break-inside: avoid;
          }

          .employee-report-page button {
            display: none !important;
          }
        }
      `}</style>

      {/* PAGE HEADER */}
      <section className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-[#090a1c] via-[#15132f] to-[#29184b] p-6 shadow-xl shadow-violet-950/15 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-violet-200/75">
              <span>Employee Workspace</span>
              <span className="text-violet-400/50">/</span>
              <span>Reports & Analytics</span>
            </div>

            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-semibold text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Personal Insights
            </span>
          </div>

          <div className="mt-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] text-violet-200">
                  <Icon name="chart" className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-violet-200">
                  KnowFlow Analytics
                </p>
              </div>

              <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Reports & Analytics
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-violet-100/70">
                A consolidated view of your work activity, knowledge
                contributions and handover participation across your projects.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-sm">
                <p className="text-[10px] font-medium uppercase tracking-wider text-violet-200/60">
                  Reporting date
                </p>
                <p className="mt-1.5 text-sm font-semibold text-white">
                  {new Date().toLocaleDateString('en-IN', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/20 text-xs font-bold text-violet-200">
                  {initials || 'ED'}
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-violet-200/60">
                    Employee
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {displayName}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/10 pt-5 text-[11px] text-violet-100/60">
            <span className="inline-flex items-center gap-2">
              <Icon name="activity" className="h-3.5 w-3.5" />
              Work activity
            </span>
            <span className="inline-flex items-center gap-2">
              <Icon name="book-open" className="h-3.5 w-3.5" />
              Knowledge contributions
            </span>
            <span className="inline-flex items-center gap-2">
              <Icon name="shield-check" className="h-3.5 w-3.5" />
              Handover continuity
            </span>
          </div>
        </div>
      </section>

      {/* REPORTING FILTERS */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
              <Icon name="sliders" className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">
                Reporting Controls
              </h2>
              <p className="mt-0.5 text-[11px] text-text-muted">
                Refine the data displayed across your personal reports
              </p>
            </div>
          </div>

          <StatusBadge label="Personal analytics" tone="green" />
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:px-6">
          <FilterSelect
            label="Project"
            value={projectFilter}
            onChange={setProjectFilter}
            options={[
              { value: 'all', label: 'All my projects' },
              ...employeeProjects.map((project) => ({
                value: String(project.id),
                label: project.name || 'Untitled project',
              })),
            ]}
          />

          <FilterSelect
            label="Reporting period"
            value={periodFilter}
            onChange={setPeriodFilter}
            options={PERIOD_OPTIONS}
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border bg-surface px-5 py-3 text-[10px] text-text-muted sm:px-6">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="info" className="h-3.5 w-3.5 text-violet-300" />
            All analytics update when you change the filters.
          </span>
          <span>Only your authorised project contributions are included.</span>
        </div>
      </Card>

      {/* EMPTY PROJECT STATE */}
      {employeeProjects.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-hover text-text-muted">
            <Icon name="folder" className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-text-primary">
            No assigned projects found
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">
            Projects assigned to you will appear here when they become
            available in your workspace.
          </p>
        </Card>
      ) : (
        <>
          {/* OVERVIEW */}
          <section>
            <SectionHeader
              number="01"
              title="Contribution Summary"
              description="A snapshot of your recorded activity within the selected scope."
            />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Projects Involved"
                value={reportData.involvedProjects}
                description="Projects with your recorded journal entries"
                icon="folder"
                tone="violet"
              />

              <MetricCard
                label="Work Records"
                value={reportData.journals.length}
                description="Your journal entries in this period"
                icon="book-open"
                tone="blue"
              />

              <MetricCard
                label="Knowledge Captured"
                value={reportData.knowledgeTotal}
                description="Knowledge items attributed to your journals"
                icon="brain"
                tone="green"
              />

              <MetricCard
                label="Handover Participation"
                value={reportData.handovers.length}
                description="Handover records involving you"
                icon="arrow-left-right"
                tone="amber"
              />
            </div>
          </section>

          {/* WORK ACTIVITY */}
          <section className="print-card">
            <SectionHeader
              number="02"
              title="Work Activity Analysis"
              description="Compare journal submissions and completed tasks over the selected reporting period."
              action={<StatusBadge label={selectedPeriod} tone="violet" />}
            />

            <ActivityChart
              journals={reportData.journals}
              period={periodFilter}
            />
          </section>

          {/* PROJECT ENGAGEMENT */}
          <section className="print-card">
            <SectionHeader
              number="03"
              title="Project Engagement"
              description="Explore your recorded work across assigned projects. Selecting one project updates this view and all other report sections."
            />

            <ProjectEngagementChart
              projects={reportData.projectActivity}
            />
          </section>

          {/* KNOWLEDGE ANALYSIS */}
          <section className="print-card">
            <SectionHeader
              number="04"
              title="Knowledge Contribution Analysis"
              description="Understand how your captured knowledge is distributed across categories."
            />

            <div className="grid gap-4 xl:grid-cols-2">
              <KnowledgeDonut
                categories={reportData.categories}
                total={reportData.knowledgeTotal}
              />

              <CategoryBreakdown
                categories={reportData.categories}
                total={reportData.knowledgeTotal}
              />
            </div>
          </section>

          {/* CONTRIBUTION REGISTER */}
          <section className="print-card">
            <SectionHeader
              number="05"
              title="Work Record Register"
              description="A category-wise breakdown of information recorded in your journals."
            />

            <Panel className="p-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {CATEGORY_META.map((category) => (
                  <div
                    key={category.key}
                    className="rounded-xl border border-border bg-surface p-4 transition hover:border-violet-500/25"
                  >
                    <div
                      className="mb-3 h-1 w-8 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <p className="text-2xl font-bold text-text-primary">
                      {reportData.categories[category.key]}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-text-muted">
                      {category.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                <span className="text-xs text-text-muted">
                  Work summaries
                </span>
                <span className="text-sm font-bold text-text-primary">
                  {reportData.workSummaries}
                </span>
              </div>

              {reportData.journals.length > 0 && (
                <div className="mt-5 overflow-x-auto rounded-xl border border-border">
                  <table className="w-full min-w-[620px] text-left text-xs">
                    <thead className="bg-surface text-[10px] uppercase tracking-wider text-text-muted">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Project</th>
                        <th className="px-4 py-3 font-semibold">Date</th>
                        <th className="px-4 py-3 font-semibold">Work summary</th>
                        <th className="px-4 py-3 text-center font-semibold">Knowledge items</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {reportData.journals.map((journal, index) => {
                        const knowledgeCount = CATEGORY_META.reduce(
                          (total, category) =>
                            total + getCount(journal[category.key]),
                          0,
                        )

                        const date = getDate(getJournalDate(journal))

                        return (
                          <tr
                            key={journal.id || `${journal.projectId}-${index}`}
                            className="transition hover:bg-surface-hover/40"
                          >
                            <td className="max-w-[180px] truncate px-4 py-3 font-medium text-text-primary">
                              {journal.projectName}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-text-muted">
                              {date ? date.toLocaleDateString() : '—'}
                            </td>
                            <td className="max-w-[300px] px-4 py-3 text-text-secondary">
                              <p className="line-clamp-2 whitespace-pre-line">
                                {getText(journal.workSummary) || 'No summary provided'}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-center font-semibold text-text-primary">
                              {knowledgeCount}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </section>

          {/* HANDOVER PARTICIPATION */}
          <section className="print-card">
            <SectionHeader
              number="06"
              title="Handover Participation"
              description="Track the status of handover records in which you are involved."
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <StatusCard
                label="Approved"
                value={reportData.handoverStatuses.approved}
                color={COLORS.green}
              />
              <StatusCard
                label="Pending"
                value={reportData.handoverStatuses.pending}
                color={COLORS.amber}
              />
              <StatusCard
                label="Changes Requested"
                value={reportData.handoverStatuses.changesRequested}
                color={COLORS.red}
              />
            </div>

            {reportData.handovers.length > 0 && (
              <Panel className="mt-4">
                <div className="border-b border-border p-5">
                  <PanelHeading
                    title="Your handover records"
                    description="Handover participation associated with your account."
                    action={
                      <StatusBadge
                        label={`${reportData.handovers.length} records`}
                        tone="violet"
                      />
                    }
                  />
                </div>

                <div className="divide-y divide-border">
                  {reportData.handovers.map((handover, index) => {
                    const status = normaliseStatus(handover.status)
                    const tone =
                      status.includes('approved') ||
                      status.includes('shared') ||
                      status.includes('completed')
                        ? 'green'
                        : status.includes('change') ||
                            status.includes('revision') ||
                            status.includes('rejected')
                          ? 'red'
                          : 'amber'

                    return (
                      <div
                        key={handover.id || `${handover.projectId}-${index}`}
                        className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-surface-hover/40"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                            <Icon name="arrow-left-right" className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-text-primary">
                              {handover.projectName}
                            </p>
                            <p className="mt-1 truncate text-[10px] text-text-muted">
                              {handover.outgoingEmployeeName || 'Outgoing member'}
                              {' → '}
                              {handover.incomingEmployeeName || 'Incoming member'}
                            </p>
                          </div>
                        </div>

                        <StatusBadge
                          label={String(handover.status || 'Pending').replace(/_/g, ' ')}
                          tone={tone}
                        />
                      </div>
                    )
                  })}
                </div>
              </Panel>
            )}
          </section>

          {/* OUTSTANDING WORK */}
          <section className="print-card">
            <SectionHeader
              number="07"
              title="Outstanding Work & Dependencies"
              description="Items recorded as pending or unresolved in your work journals."
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <MetricCard
                label="Pending Tasks"
                value={reportData.pendingTasks}
                description="Tasks recorded as not yet completed"
                icon="clock"
                tone="amber"
              />

              <MetricCard
                label="Unresolved Blockers"
                value={reportData.blockers}
                description="Blockers recorded in your journals"
                icon="alert-triangle"
                tone="red"
              />

              <MetricCard
                label="Open Dependencies"
                value={reportData.dependencies}
                description="Dependencies recorded for follow-up"
                icon="git-branch"
                tone="blue"
              />
            </div>
          </section>

          {/* REPORT EXPORT */}
          <section className="print-card">
            <SectionHeader
              number="08"
              title="Report Generation & Export"
              description="Generate a personal report using your currently selected project and reporting period."
            />

            <Panel className="p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-violet-500/10 p-3 text-violet-300">
                    <Icon name="file-bar-chart" className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">
                      Personal Contribution Report
                    </h3>
                    <p className="mt-1 max-w-xl text-xs leading-5 text-text-muted">
                      Includes your activity, project engagement, knowledge
                      categories, handover participation and outstanding work.
                    </p>
                    <p className="mt-2 text-[10px] text-text-muted">
                      Project: {selectedProjectName} · Period: {selectedPeriod}
                    </p>
                  </div>
                </div>

                <div className="no-print flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleExport}
                    className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-xs font-semibold text-white shadow-lg shadow-violet-950/20 transition hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                  >
                    <Icon name="download" className="h-4 w-4" />
                    Export CSV
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-xs font-semibold text-text-secondary transition hover:bg-surface-hover hover:text-text-primary"
                  >
                    <Icon name="printer" className="h-4 w-4" />
                    Print / Save PDF
                  </button>
                </div>
              </div>
            </Panel>
          </section>

          {/* FOOTER */}
          <div className="flex flex-col justify-between gap-2 border-t border-border pt-5 text-[10px] text-text-faint sm:flex-row">
            <span>KnowFlow · Personal Contribution Insights</span>
            <span>
              {selectedProjectName} · {selectedPeriod}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
